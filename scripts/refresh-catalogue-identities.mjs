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
const malByKitsu = new Map();
for (const anime of payload.data) {
  const mappings = anime.relationships?.mappings?.data ?? [];
  const mal = mappings
    .map((reference) => included.get(reference.id))
    .find((mapping) => mapping?.attributes?.externalSite === "myanimelist/anime");
  const malId = String(mal?.attributes?.externalId ?? "");
  malByKitsu.set(String(anime.id), /^\d+$/.test(malId) ? malId : null);
}

const items = catalogue.items.map((anime) => ({
  ...anime,
  malId: malByKitsu.get(String(anime.kitsuId)) ?? null,
}));
const malIdCoverage = items.filter((anime) => anime.malId).length;
if (malIdCoverage < Math.floor(items.length * 0.8)) {
  throw new Error(`Identity refresh rejected: only ${malIdCoverage}/${items.length} MAL mappings.`);
}

const output = {
  ...catalogue,
  meta: { ...catalogue.meta, malIdCoverage },
  items,
};
await writeFile(OUTPUT, `${JSON.stringify(output)}\n`, "utf8");
console.log(`Catalogue identities refreshed: ${items.length} Kitsu IDs, ${malIdCoverage} MAL mappings.`);
