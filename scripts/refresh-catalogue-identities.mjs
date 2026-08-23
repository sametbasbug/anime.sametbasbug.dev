import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fetchAnimeByIds } from "./lib/kitsu-api.mjs";

const OUTPUT = resolve("src/data/catalogue.json");
const catalogue = JSON.parse(await readFile(OUTPUT, "utf8"));
const payload = await fetchAnimeByIds(catalogue.items.map((anime) => anime.kitsuId), { include: "mappings" });

if (payload.data.length !== catalogue.items.length) {
  throw new Error(`Identity refresh rejected: Kitsu returned ${payload.data.length}/${catalogue.items.length} anime.`);
}

const included = new Map((payload.included ?? []).map((resource) => [resource.id, resource]));
const identitiesByKitsu = new Map();
for (const anime of payload.data) {
  const mappings = anime.relationships?.mappings?.data ?? [];
  const externalId = (site) => {
    const mapping = mappings
      .map((reference) => included.get(reference.id))
      .find((candidate) => candidate?.attributes?.externalSite === site);
    const id = String(mapping?.attributes?.externalId ?? "");
    return /^\d+$/.test(id) ? id : null;
  };
  identitiesByKitsu.set(String(anime.id), {
    malId: externalId("myanimelist/anime"),
    anilistId: externalId("anilist/anime"),
  });
}

const items = catalogue.items.map((anime) => ({
  ...anime,
  malId: identitiesByKitsu.get(String(anime.kitsuId))?.malId ?? null,
  anilistId: identitiesByKitsu.get(String(anime.kitsuId))?.anilistId ?? null,
}));
const malIdCoverage = items.filter((anime) => anime.malId).length;
const anilistIdCoverage = items.filter((anime) => anime.anilistId).length;
if (malIdCoverage < Math.floor(items.length * 0.8)) {
  throw new Error(`Identity refresh rejected: only ${malIdCoverage}/${items.length} MAL mappings.`);
}

const output = {
  ...catalogue,
  meta: { ...catalogue.meta, malIdCoverage, anilistIdCoverage },
  items,
};
await writeFile(OUTPUT, `${JSON.stringify(output)}\n`, "utf8");
console.log(`Catalogue identities refreshed: ${items.length} Kitsu IDs, ${malIdCoverage} MAL and ${anilistIdCoverage} AniList mappings.`);
