import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const CATALOGUE_PATH = resolve("src/data/catalogue.json");
const OUTPUT_PATH = resolve("src/data/tmdb-posters.json");
const API_ROOT = "https://api.themoviedb.org/3";
const token = process.env.TMDB_API_READ_TOKEN;
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Number.POSITIVE_INFINITY;
const idsArg = process.argv.find((arg) => arg.startsWith("--ids="));
const requestedIds = idsArg
  ? new Set(idsArg.split("=")[1].split(",").map((value) => value.trim()).filter(Boolean))
  : null;
const refresh = process.argv.includes("--refresh");
const retryRejected = process.argv.includes("--retry-rejected");
const concurrency = 6;

if (!token) {
  throw new Error("TMDB_API_READ_TOKEN is required.");
}

const catalogue = JSON.parse(await readFile(CATALOGUE_PATH, "utf8"));
let previous = { meta: {}, entries: {} };
try {
  previous = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const entries = refresh ? {} : { ...(previous.entries ?? {}) };
const rejected = refresh ? {} : { ...(previous.rejected ?? {}) };

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

const ordinalWords = { second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 };
const romanNumerals = { II: 2, III: 3, IV: 4, V: 5, VI: 6 };

function normalizeTitle(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function titleTokens(value) {
  return new Set(normalizeTitle(value).split(" ").filter(Boolean));
}

function similarity(left, right) {
  const a = titleTokens(left);
  const b = titleTokens(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((tokenValue) => b.has(tokenValue)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

function parseLineageTitle(value) {
  let base = value
    .replace(/\s*\((?:19|20)\d{2}\)\s*$/, "")
    .trim();
  let isLineage = false;
  let seasonNumber = null;

  const branchMatch = base.match(/\s+Part\s+\d+\s*[:\-].*$/i);
  if (branchMatch) {
    base = base.replace(branchMatch[0], "").trim();
    isLineage = true;
  }

  const relatedWorkRules = [
    /\s+(?:OVA|OAD)(?:\s*\d+)?(?:\s*[:\-].*)?$/i,
    /\s+(?:TV\s+)?Special(?:\s+Episode)?(?:\s*[:\-].*)?$/i,
    /\s+Final\s+Stage$/i,
  ];
  for (const pattern of relatedWorkRules) {
    if (!pattern.test(base)) continue;
    base = base.replace(pattern, "").trim();
    isLineage = true;
    break;
  }

  if (/\s+Part\s+\d+\s*$/i.test(base)) {
    base = base.replace(/\s+Part\s+\d+\s*$/i, "").trim();
    isLineage = true;
  }

  const seasonRules = [
    [/\s*\((?:Season|Saison)\s*(\d+)\)\s*$/i, (match) => Number(match[1])],
    [/\s+(\d+)(?:st|nd|rd|th)\s+Season(?:\s*[:\-].*)?$/i, (match) => Number(match[1])],
    [/\s+Season\s*(\d+)(?:\s*[:\-].*)?$/i, (match) => Number(match[1])],
    [/\s+(\d+)(?:st|nd|rd|th)\s+Stage$/i, (match) => Number(match[1])],
    [/\s+S\s*(\d+)$/i, (match) => Number(match[1])],
    [/\s+(Second|Third|Fourth|Fifth|Sixth)\s+Season$/i, (match) => ordinalWords[match[1].toLowerCase()]],
    [/(?<!\bAct)\s+(II|III|IV|V|VI)$/i, (match) => romanNumerals[match[1].toUpperCase()]],
    [/\s+([2-6])$/i, (match) => Number(match[1])],
  ];

  for (const [pattern, getSeason] of seasonRules) {
    const match = base.match(pattern);
    if (!match) continue;
    base = base.replace(pattern, "").trim();
    seasonNumber = getSeason(match);
    isLineage = true;
    break;
  }

  // “Act II” is a subtitle/series branch, not a reliable TMDB season number.
  if (/\bAct\s+II$/i.test(base)) seasonNumber = null;

  if (/\s+Final\s+Season$/i.test(base)) {
    base = base.replace(/\s+Final\s+Season$/i, "").trim();
    isLineage = true;
  }

  return {
    base: base.replace(/[\s:,-]+$/, ""),
    isLineage,
    seasonNumber,
  };
}

function seriesLineage(anime) {
  const parsed = [anime.title, ...anime.synonyms].map(parseLineageTitle);
  const primaryIsExplicit = parsed[0].isLineage;
  const taggedSequel = anime.tags.includes("sequel");
  const relatedFormatEvidence = ["OVA", "SPECIAL"].includes(anime.type)
    && parsed.some((item) => item.isLineage);
  if (!primaryIsExplicit) {
    const seasonEvidence = parsed
      .filter((item) => item.isLineage && item.seasonNumber !== null)
      .reduce((counts, item) => {
        counts.set(item.seasonNumber, (counts.get(item.seasonNumber) ?? 0) + 1);
        return counts;
      }, new Map());
    const strongestEvidence = [...seasonEvidence.values()].sort((left, right) => right - left)[0] ?? 0;
    const baseEvidence = parsed
      .filter((item) => item.isLineage)
      .reduce((counts, item) => {
        const normalizedBase = normalizeTitle(item.base);
        counts.set(normalizedBase, (counts.get(normalizedBase) ?? 0) + 1);
        return counts;
      }, new Map());
    const strongestBaseEvidence = [...baseEvidence.values()].sort((left, right) => right - left)[0] ?? 0;
    if (strongestEvidence < 2
      && strongestBaseEvidence < 2
      && !taggedSequel
      && !relatedFormatEvidence) return null;
  }

  const aliases = [...new Map(parsed
    .filter((item) => item.base.length >= 3 && item.base.length <= 90)
    .map((item) => [normalizeTitle(item.base), item.base])).values()];

  return {
    aliases,
    // Synonym consensus proves this belongs to a parent series, but not that
    // AniList and TMDB number seasons identically. Use the parent artwork only.
    seasonNumber: primaryIsExplicit ? parsed[0].seasonNumber : null,
    inferredFromAliases: !primaryIsExplicit,
  };
}

function usefulQueries(anime) {
  const seen = new Set();
  const values = [anime.title, ...anime.synonyms]
    .filter((value) => value && value.length >= 3 && value.length <= 90)
    .filter((value) => {
      const normalized = normalizeTitle(value);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });

  const officialEnglish = values.find((value) => /^[\x00-\x7F]+$/.test(value) && value.includes(" "));
  const japanese = values.find((value) => /[\u3040-\u30ff\u3400-\u9fff]/.test(value));
  const asciiAliases = values.filter((value) => /^[\x00-\x7F]+$/.test(value));
  return [...new Set([
    anime.title,
    officialEnglish,
    ...asciiAliases,
    japanese,
  ].filter(Boolean))].slice(0, 6);
}

async function tmdb(path, attempt = 0) {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": "equinox-rota-poster-refresh",
    },
  });

  if (response.status === 429 && attempt < 4) {
    const retryAfter = Number(response.headers.get("retry-after") ?? 1);
    await sleep(Math.max(1000, retryAfter * 1000));
    return tmdb(path, attempt + 1);
  }
  if (!response.ok) {
    if (attempt < 2 && response.status >= 500) {
      await sleep(750 * (attempt + 1));
      return tmdb(path, attempt + 1);
    }
    throw new Error(`TMDB request failed (${response.status}) for ${path}`);
  }
  return response.json();
}

function candidateScore(anime, mediaType, candidate) {
  if (!candidate.poster_path) return null;
  const candidateTitles = mediaType === "movie"
    ? [candidate.title, candidate.original_title]
    : [candidate.name, candidate.original_name];
  const aliases = [anime.title, ...anime.synonyms];
  const normalizedAliases = new Set(aliases.map(normalizeTitle));
  const exact = candidateTitles.some((title) => normalizedAliases.has(normalizeTitle(title ?? "")));
  const bestSimilarity = Math.max(...candidateTitles.flatMap((candidateTitle) =>
    aliases.map((alias) => similarity(candidateTitle ?? "", alias))));
  const date = mediaType === "movie" ? candidate.release_date : candidate.first_air_date;
  const candidateYear = Number(date?.slice(0, 4)) || null;
  const yearDifference = candidateYear === null ? 99 : Math.abs(candidateYear - anime.season.year);
  const animated = candidate.genre_ids?.includes(16) ?? false;
  const regionalAnimation = ["ja", "ko", "zh"].includes(candidate.original_language);
  const topSearchResult = candidate._bestRank === 0;

  const accepted = (exact && animated && yearDifference <= 2)
    || (exact && regionalAnimation && yearDifference <= 1)
    || (bestSimilarity >= 0.9 && animated && yearDifference <= 1)
    || (topSearchResult && animated && regionalAnimation && yearDifference === 0 && bestSimilarity >= 0.4);
  if (!accepted) return null;

  const score = (exact ? 60 : bestSimilarity * 40)
    + (yearDifference === 0 ? 25 : yearDifference === 1 ? 15 : 6)
    + (animated ? 10 : 0)
    + (regionalAnimation ? 5 : 0)
    + (topSearchResult ? 4 : 0)
    + Math.min(5, Math.log10((candidate.popularity ?? 0) + 1));

  return {
    candidate,
    candidateYear,
    exact,
    similarity: Math.round(bestSimilarity * 1000) / 1000,
    score,
  };
}

async function findPoster(anime) {
  const mediaType = anime.type === "MOVIE" ? "movie" : "tv";
  const yearParameter = mediaType === "movie" ? "year" : "first_air_date_year";
  const candidates = new Map();

  const queries = usefulQueries(anime);
  for (const includeYear of [true, false]) {
    for (const query of queries) {
      const params = new URLSearchParams({
        query,
        include_adult: "false",
        language: "en-US",
      });
      if (includeYear) params.set(yearParameter, String(anime.season.year));
      const payload = await tmdb(`/search/${mediaType}?${params}`);
      for (const [rank, candidate] of (payload.results ?? []).entries()) {
        const previousCandidate = candidates.get(candidate.id);
        candidates.set(candidate.id, {
          ...candidate,
          _bestRank: Math.min(previousCandidate?._bestRank ?? Number.POSITIVE_INFINITY, rank),
        });
      }
    }
  }

  const scored = [...candidates.values()]
    .map((candidate) => candidateScore(anime, mediaType, candidate))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best && mediaType !== "movie") return findSeriesPoster(anime);
  if (!best) return null;

  return {
    tmdbId: best.candidate.id,
    mediaType,
    posterPath: best.candidate.poster_path,
    matchedTitle: mediaType === "movie" ? best.candidate.title : best.candidate.name,
    matchedYear: best.candidateYear,
    confidence: best.exact ? "exact" : best.similarity >= 0.9 ? "high" : "search-year",
    similarity: best.similarity,
  };
}

async function findSeriesPoster(anime) {
  const lineage = seriesLineage(anime);
  if (!lineage) return null;

  const normalizedAliases = new Set(lineage.aliases.map(normalizeTitle));
  const officialEnglish = lineage.aliases.find((value) => /^[\x00-\x7F]+$/.test(value) && value.includes(" "));
  const asciiAliases = lineage.aliases.filter((value) => /^[\x00-\x7F]+$/.test(value));
  const japanese = lineage.aliases.find((value) => /[\u3040-\u30ff\u3400-\u9fff]/.test(value));
  const queries = [...new Set([
    lineage.aliases[0],
    officialEnglish,
    ...asciiAliases,
    japanese,
  ].filter(Boolean))].slice(0, 6);
  const japaneseProduction = anime.tags.includes("japanese production");
  const parents = new Map();

  for (const query of queries) {
    const params = new URLSearchParams({
      query,
      include_adult: "false",
      language: "en-US",
    });
    const payload = await tmdb(`/search/tv?${params}`);
    for (const candidate of payload.results ?? []) {
      const titles = [candidate.name, candidate.original_name];
      const exactAlias = titles.some((title) => normalizedAliases.has(normalizeTitle(title ?? "")));
      const prefixedAlias = titles.some((title) => {
        const normalizedTitle = normalizeTitle(title ?? "");
        return [...normalizedAliases].some((alias) => alias.split(" ").length >= 2
          && normalizedTitle.startsWith(`${alias} `));
      });
      const animated = candidate.genre_ids?.includes(16) ?? false;
      const regionalAnimation = ["ja", "ko", "zh"].includes(candidate.original_language);
      if (!(exactAlias || prefixedAlias)
        || !animated
        || !(regionalAnimation || japaneseProduction)) continue;
      const candidateYear = Number(candidate.first_air_date?.slice(0, 4)) || null;
      const yearGap = candidateYear === null
        ? 99
        : anime.season.year - candidateYear;
      const score = (exactAlias ? 100 : 60)
        + (yearGap >= 0 ? Math.max(0, 30 - yearGap) : -50 - Math.abs(yearGap))
        + Math.min(8, Math.log10((candidate.popularity ?? 0) + 1) * 2);
      const existing = parents.get(candidate.id);
      if (!existing || score > existing._lineageScore) {
        parents.set(candidate.id, { ...candidate, _lineageScore: score });
      }
    }
  }

  const parent = [...parents.values()]
    .sort((left, right) => right._lineageScore - left._lineageScore)[0];
  if (!parent) return null;

  let posterPath = parent.poster_path;
  let posterKind = "series";
  if (lineage.seasonNumber !== null) {
    const details = await tmdb(`/tv/${parent.id}?language=en-US`);
    const season = (details.seasons ?? []).find((item) => item.season_number === lineage.seasonNumber);
    if (season?.poster_path) {
      posterPath = season.poster_path;
      posterKind = `season-${lineage.seasonNumber}`;
    }
  }

  if (!posterPath) return null;

  return {
    tmdbId: parent.id,
    mediaType: "tv",
    posterPath,
    matchedTitle: parent.name,
    matchedYear: Number(parent.first_air_date?.slice(0, 4)) || null,
    confidence: "series-lineage",
    posterKind,
    seasonNumber: lineage.seasonNumber,
    inferredFromAliases: lineage.inferredFromAliases,
  };
}

async function save() {
  const orderedEntries = {};
  const orderedRejected = {};
  for (const anime of catalogue.items) {
    if (entries[anime.id]) orderedEntries[anime.id] = entries[anime.id];
    if (rejected[anime.id]) orderedRejected[anime.id] = rejected[anime.id];
  }
  const output = {
    meta: {
      source: "https://www.themoviedb.org/",
      generatedAt: new Date().toISOString(),
      catalogueRelease: catalogue.meta.release,
      matchedCount: Object.keys(orderedEntries).length,
      rejectedCount: Object.keys(orderedRejected).length,
      imageBaseUrl: "https://image.tmdb.org/t/p/w500",
      matching: "Strict title + year + media type matching across known aliases, plus exact parent-series matching for explicit sequels or corroborated season aliases; unmatched titles keep Rota artwork.",
    },
    entries: orderedEntries,
    rejected: orderedRejected,
  };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output)}\n`, "utf8");
}

const pending = catalogue.items
  .filter((anime) => requestedIds?.has(String(anime.id))
    || refresh
    || (retryRejected ? Boolean(rejected[anime.id]) : (!entries[anime.id] && !rejected[anime.id])))
  .slice(0, limit);
let completed = 0;

for (let index = 0; index < pending.length; index += concurrency) {
  const batch = pending.slice(index, index + concurrency);
  const results = await Promise.all(batch.map(async (anime) => {
    try {
      return { anime, match: await findPoster(anime) };
    } catch (error) {
      console.error(`TMDB error for ${anime.title}: ${error.message}`);
      return { anime, error };
    }
  }));

  for (const { anime, match, error } of results) {
    if (error) continue;
    if (match) {
      entries[anime.id] = match;
      delete rejected[anime.id];
    } else {
      rejected[anime.id] = { checkedAt: new Date().toISOString() };
      delete entries[anime.id];
    }
    completed += 1;
  }
  if (completed % 30 === 0 || completed === pending.length) await save();
  console.log(`${Math.min(index + batch.length, pending.length)}/${pending.length} · ${Object.keys(entries).length} poster matched`);
  await sleep(120);
}

await save();
console.log(`Wrote ${Object.keys(entries).length} TMDB poster matches to ${OUTPUT_PATH}.`);
