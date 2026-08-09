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

const ordinalWords = { second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 };

const normalizeIdentityTitle = (value) => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("en-US")
  .replace(/&/g, " and ")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim()
  .replace(/\s+/g, " ");

function semanticDuplicateKey(anime) {
  return `${normalizeIdentityTitle(anime.title)}|${anime.type}|${anime.animeSeason?.year ?? "?"}`;
}

function mergeStringLists(...lists) {
  return [...new Set(lists.flat().filter(Boolean))];
}

function collapseExactDuplicates(entries) {
  const groups = new Map();
  for (const anime of entries) {
    const key = semanticDuplicateKey(anime);
    const group = groups.get(key) ?? [];
    group.push(anime);
    groups.set(key, group);
  }

  let collapsedCount = 0;
  const collapsed = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      collapsed.push(group[0]);
      continue;
    }

    const ranked = [...group].sort((left, right) =>
      right.sources.length - left.sources.length
      || (right.score?.arithmeticGeometricMean ?? 0) - (left.score?.arithmeticGeometricMean ?? 0));
    const primary = ranked[0];
    const merged = ranked.slice(1).reduce((result, duplicate) => ({
      ...result,
      synonyms: mergeStringLists(result.synonyms, duplicate.synonyms),
      studios: mergeStringLists(result.studios, duplicate.studios),
      tags: mergeStringLists(result.tags, duplicate.tags),
      sources: mergeStringLists(result.sources, duplicate.sources),
    }), primary);
    collapsed.push(merged);
    collapsedCount += ranked.length - 1;
  }

  return { entries: collapsed, collapsedCount };
}

function parseSeasonLineage(value) {
  let base = value.replace(/\s*\((?:19|20)\d{2}\)\s*$/, "").trim();
  const seasonRules = [
    [/\s*\((?:Season|Saison)\s*(\d+)\)\s*$/i, (match) => Number(match[1])],
    [/\s+(\d+)(?:st|nd|rd|th)\s+Season(?:\s*[:\-].*)?$/i, (match) => Number(match[1])],
    [/\s+Season\s*(\d+)(?:\s*[:\-].*)?$/i, (match) => Number(match[1])],
    [/\s+(Second|Third|Fourth|Fifth|Sixth)\s+Season$/i, (match) => ordinalWords[match[1].toLowerCase()]],
  ];

  for (const [pattern, getSeason] of seasonRules) {
    const match = base.match(pattern);
    if (!match) continue;
    base = base.replace(pattern, "").trim();
    return { base, seasonNumber: getSeason(match) };
  }

  return { base, seasonNumber: null };
}

function seasonDescriptor(anime) {
  const primary = parseSeasonLineage(anime.title);
  const variants = [anime.title, ...anime.synonyms]
    .map(parseSeasonLineage)
    .filter((item) => item.base.length >= 3);
  return {
    seasonNumber: primary.seasonNumber,
    bases: new Set(variants.map((item) => normalizeIdentityTitle(item.base))),
  };
}

function sharesLineage(left, right) {
  return [...left.bases].some((base) => right.bases.has(base));
}

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

const semantic = collapseExactDuplicates(dataset.data);

const usable = semantic.entries.filter((anime) =>
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

const usableById = new Map(usable.map((anime) => [stableId(anime), anime]));
const lineageIndex = usable.map((anime) => ({ anime, descriptor: seasonDescriptor(anime) }));

function findPreviousSeasons(anime) {
  const current = seasonDescriptor(anime);
  if (current.seasonNumber === null || current.seasonNumber <= 1) return [];

  const parents = [];
  for (let seasonNumber = current.seasonNumber - 1; seasonNumber >= 1; seasonNumber -= 1) {
    const candidates = lineageIndex
      .filter(({ anime: candidate, descriptor }) => candidate.type === anime.type
        && sharesLineage(current, descriptor)
        && (descriptor.seasonNumber ?? 1) === seasonNumber)
      .sort((left, right) => right.anime.sources.length - left.anime.sources.length
        || (right.anime.score?.arithmeticGeometricMean ?? 0) - (left.anime.score?.arithmeticGeometricMean ?? 0));
    if (candidates[0]) parents.push(candidates[0].anime);
  }
  return parents;
}

const deduped = new Map();
for (const anime of [...recent, ...topOverall]) {
  const item = compact(anime);
  deduped.set(item.id, item);
}

const ranked = [...deduped.values()]
  .sort((a, b) => (b.season.year - a.season.year) || ((b.score ?? 0) - (a.score ?? 0)))
  .slice(0, MAX_ITEMS);
const landmarkCandidates = new Map();
for (const anime of usable.filter((candidate) => LANDMARK_TITLES.has(candidate.title))) {
  const existing = landmarkCandidates.get(anime.title);
  const isStronger = !existing
    || anime.sources.length > existing.sources.length
    || (anime.sources.length === existing.sources.length
      && (anime.score?.arithmeticGeometricMean ?? 0) > (existing.score?.arithmeticGeometricMean ?? 0));
  if (isStronger) landmarkCandidates.set(anime.title, anime);
}
const landmarks = [...LANDMARK_TITLES]
  .map((title) => landmarkCandidates.get(title))
  .filter(Boolean)
  .map(compact);
const landmarkIds = new Set(landmarks.map((anime) => anime.id));
const initial = [...landmarks, ...ranked.filter((anime) => !landmarkIds.has(anime.id))].slice(0, MAX_ITEMS);
const finalById = new Map(initial.map((anime) => [anime.id, anime]));
const protectedIds = new Set(landmarkIds);

for (const item of initial) {
  const sourceAnime = usableById.get(item.id);
  if (!sourceAnime) continue;
  const descriptor = seasonDescriptor(sourceAnime);
  if (descriptor.seasonNumber === null || descriptor.seasonNumber <= 1) continue;

  protectedIds.add(item.id);
  for (const previousSeason of findPreviousSeasons(sourceAnime)) {
    const previousItem = compact(previousSeason);
    finalById.set(previousItem.id, previousItem);
    protectedIds.add(previousItem.id);
  }
}

if (protectedIds.size > MAX_ITEMS) {
  throw new Error(`Franchise closure protected ${protectedIds.size} entries, exceeding the ${MAX_ITEMS} item catalogue limit.`);
}

const initialRank = new Map(initial.map((anime, index) => [anime.id, index]));
const removable = [...finalById.values()]
  .filter((anime) => !protectedIds.has(anime.id))
  .sort((left, right) => (initialRank.get(right.id) ?? Number.POSITIVE_INFINITY)
    - (initialRank.get(left.id) ?? Number.POSITIVE_INFINITY));
while (finalById.size > MAX_ITEMS && removable.length) {
  finalById.delete(removable.shift().id);
}

const landmarkOrder = new Map(landmarks.map((anime, index) => [anime.id, index]));
const items = [...finalById.values()].sort((left, right) => {
  const leftLandmark = landmarkOrder.get(left.id);
  const rightLandmark = landmarkOrder.get(right.id);
  if (leftLandmark !== undefined || rightLandmark !== undefined) {
    if (leftLandmark === undefined) return 1;
    if (rightLandmark === undefined) return -1;
    return leftLandmark - rightLandmark;
  }
  return (right.season.year - left.season.year) || ((right.score ?? 0) - (left.score ?? 0));
});

const output = {
  meta: {
    source: dataset.repository,
    release: release.tag_name,
    lastUpdate: dataset.lastUpdate,
    generatedAt: new Date().toISOString(),
    license: dataset.license,
    originalEntryCount: dataset.data.length,
    entryCount: items.length,
    semanticDuplicatesCollapsed: semantic.collapsedCount,
    franchiseClosureCount: [...protectedIds].filter((id) => !initialRank.has(id)).length,
    selection: "Recent scored titles (2022+), historically well-covered titles, and one strongest canonical record per documented landmark title; exact title/year/type duplicates are consolidated, then explicit sequel seasons retain available predecessors before the catalogue is trimmed to its limit.",
  },
  items,
};

await writeFile(OUTPUT, `${JSON.stringify(output)}\n`, "utf8");
console.log(`Wrote ${items.length} entries to ${OUTPUT}.`);
