import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const REPOSITORY = "manami-project/anime-offline-database";
const EXPECTED_LICENSE = "Open Data Commons Open Database License";
const OUTPUT = resolve("src/data/catalogue.json");
const MAX_ITEMS = 900;
const TAG_LIMIT = 36;
const PRIMARY_TAGS = [
  "action", "adventure", "comedy", "drama", "fantasy", "romance", "mystery",
  "psychological", "thriller", "horror", "supernatural", "science fiction", "scifi",
  "sports", "music", "historical", "crime", "isekai", "slice of life", "daily life",
  "martial arts", "school", "high school", "dark fantasy", "contemporary fantasy",
];
const primaryTagRank = new Map(PRIMARY_TAGS.map((tag, index) => [tag, index]));
const LANDMARK_TITLES = new Set([
  "Cowboy Bebop",
  "Death Note",
  "Fullmetal Alchemist: Brotherhood",
  "Jujutsu Kaisen",
  "Kimi no Na wa.",
  "Kimetsu no Yaiba",
  "Naruto",
  "One Piece",
  "Sen to Chihiro no Kamikakushi",
  "Shingeki no Kyojin",
  "Sousou no Frieren",
]);

const slugify = (value) => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "")
  .slice(0, 72) || "anime";

function stableId(anime) {
  const preferred = anime.sources.find((source) => source.includes("myanimelist.net/anime/"))
    ?? anime.sources.find((source) => source.includes("anidb.net/anime/"))
    ?? anime.sources[0];
  const numeric = preferred?.match(/(?:anime\/|aid=)(\d+)/)?.[1];
  if (numeric) return numeric;

  let hash = 2166136261;
  for (const char of preferred ?? anime.title) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return String(hash >>> 0);
}

function compactTags(tags) {
  return [...tags]
    .sort((a, b) => {
      const aRank = primaryTagRank.get(a.toLowerCase()) ?? 999;
      const bRank = primaryTagRank.get(b.toLowerCase()) ?? 999;
      return aRank - bRank || a.localeCompare(b, "en");
    })
    .slice(0, TAG_LIMIT);
}

function compact(anime) {
  const id = stableId(anime);
  const score = anime.score?.arithmeticGeometricMean ?? anime.score?.median ?? null;
  return {
    id,
    slug: `${slugify(anime.title)}-${id}`,
    title: anime.title,
    type: anime.type,
    episodes: anime.episodes,
    status: anime.status,
    season: anime.animeSeason,
    durationSeconds: anime.duration?.value ?? null,
    score: score === null ? null : Math.round(score * 10) / 10,
    synonyms: anime.synonyms.slice(0, 24),
    studios: anime.studios.slice(0, 8),
    tags: compactTags(anime.tags),
    sources: anime.sources,
  };
}

const releaseResponse = await fetch(`https://api.github.com/repos/${REPOSITORY}/releases/latest`, {
  headers: { Accept: "application/vnd.github+json", "User-Agent": "rota-data-refresh" },
});
if (!releaseResponse.ok) throw new Error(`GitHub release request failed: ${releaseResponse.status}`);

const release = await releaseResponse.json();
const asset = release.assets.find((item) => item.name === "anime-offline-database-minified.json");
if (!asset) throw new Error("Latest release does not contain the expected dataset asset.");

console.log(`Downloading ${release.tag_name} (${Math.round(asset.size / 1024 / 1024)} MB)...`);
const datasetResponse = await fetch(asset.browser_download_url, { headers: { "User-Agent": "rota-data-refresh" } });
if (!datasetResponse.ok) throw new Error(`Dataset download failed: ${datasetResponse.status}`);
const dataset = await datasetResponse.json();

if (!dataset.license?.name?.includes(EXPECTED_LICENSE)) {
  throw new Error(`Unexpected dataset license: ${dataset.license?.name ?? "missing"}`);
}

const usable = dataset.data.filter((anime) =>
  anime.title
  && anime.type !== "UNKNOWN"
  && anime.status !== "UNKNOWN"
  && anime.animeSeason?.year
  && anime.score?.arithmeticGeometricMean,
);

const topOverall = [...usable]
  .filter((anime) => anime.episodes > 0 && anime.sources.length >= 4)
  .sort((a, b) => {
    const byCoverage = b.sources.length - a.sources.length;
    return byCoverage || b.score.arithmeticGeometricMean - a.score.arithmeticGeometricMean;
  })
  .slice(0, 450);

const recent = [...usable]
  .filter((anime) => anime.animeSeason.year >= 2022 && anime.sources.length >= 3)
  .sort((a, b) => {
    const byYear = b.animeSeason.year - a.animeSeason.year;
    const byCoverage = b.sources.length - a.sources.length;
    return byYear || byCoverage || b.score.arithmeticGeometricMean - a.score.arithmeticGeometricMean;
  })
  .slice(0, 650);

const deduped = new Map();
for (const anime of [...recent, ...topOverall]) {
  const item = compact(anime);
  deduped.set(item.id, item);
}

const ranked = [...deduped.values()]
  .sort((a, b) => (b.season.year - a.season.year) || ((b.score ?? 0) - (a.score ?? 0)))
  .slice(0, MAX_ITEMS);
const landmarks = usable.filter((anime) => LANDMARK_TITLES.has(anime.title)).map(compact);
const landmarkIds = new Set(landmarks.map((anime) => anime.id));
const items = [...landmarks, ...ranked.filter((anime) => !landmarkIds.has(anime.id))].slice(0, MAX_ITEMS);

const output = {
  meta: {
    source: dataset.repository,
    release: release.tag_name,
    lastUpdate: dataset.lastUpdate,
    generatedAt: new Date().toISOString(),
    license: dataset.license,
    originalEntryCount: dataset.data.length,
    entryCount: items.length,
    selection: "Recent scored titles (2022+), historically well-covered titles, and a small documented landmark set; ranked by source coverage and score, then deduplicated by source ID.",
  },
  items,
};

await writeFile(OUTPUT, `${JSON.stringify(output)}\n`, "utf8");
console.log(`Wrote ${items.length} entries to ${OUTPUT}.`);
