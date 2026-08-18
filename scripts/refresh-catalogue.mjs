import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  fetchAnimeByIds,
  kitsuRequest,
  kitsuTitles,
  legacyKitsuId,
  normalizeTitle,
} from "./lib/kitsu-api.mjs";

const OUTPUT = resolve("src/data/catalogue.json");
const SEED_OUTPUT = resolve("src/data/kitsu-catalogue-seed.json");
const TARGET_ITEMS = 2_500;
const API_INCLUDE = "genres,categories,productions.company";
const CURRENT_YEAR = new Date().getUTCFullYear();
const RESEED = process.argv.includes("--reseed");

const typeMap = new Map([
  ["tv", "TV"],
  ["movie", "MOVIE"],
  ["ova", "OVA"],
  ["ona", "ONA"],
  ["special", "SPECIAL"],
  ["music", "SPECIAL"],
]);
const statusMap = new Map([
  ["finished", "FINISHED"],
  ["current", "ONGOING"],
  ["upcoming", "UPCOMING"],
  ["unreleased", "UPCOMING"],
  ["tba", "UPCOMING"],
]);

function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72) || "anime";
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readOptionalJson(path) {
  try {
    return await readJson(path);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function indexIncluded(resources) {
  return new Map(resources.map((resource) => [`${resource.type}:${resource.id}`, resource]));
}

function seasonFromDate(startDate) {
  const match = String(startDate ?? "").match(/^(\d{4})-(\d{2})-/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  const season = month <= 3 ? "WINTER" : month <= 6 ? "SPRING" : month <= 9 ? "SUMMER" : "FALL";
  return { season, year };
}

function relationshipResources(resource, relationship, includedIndex) {
  const references = resource.relationships?.[relationship]?.data ?? [];
  return references
    .map((reference) => includedIndex.get(`${reference.type}:${reference.id}`))
    .filter(Boolean);
}

function studiosFor(resource, includedIndex) {
  const productions = relationshipResources(resource, "productions", includedIndex);
  return [...new Set(productions
    .filter((production) => production.attributes?.role === "studio")
    .map((production) => {
      const company = production.relationships?.company?.data;
      if (!company) return null;
      return includedIndex.get(`${company.type}:${company.id}`)?.attributes?.name ?? null;
    })
    .filter(Boolean))]
    .slice(0, 8);
}

function tagsFor(resource, includedIndex) {
  const related = [
    ...relationshipResources(resource, "genres", includedIndex),
    ...relationshipResources(resource, "categories", includedIndex),
  ];
  return [...new Set(related
    .filter((item) => item.attributes?.nsfw !== true)
    .map((item) => item.attributes?.slug ?? item.attributes?.name ?? item.attributes?.title)
    .filter(Boolean)
    .map((value) => String(value).toLocaleLowerCase("en-US").replace(/-/g, " ")))]
    .slice(0, 36);
}

function stableKitsuMediaUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "media.kitsu.app" ? url.toString() : null;
  } catch {
    return null;
  }
}

function imageSet(image) {
  const large = stableKitsuMediaUrl(image?.large);
  if (!large) return null;
  return {
    tiny: stableKitsuMediaUrl(image.tiny),
    small: stableKitsuMediaUrl(image.small),
    medium: stableKitsuMediaUrl(image.medium),
    large,
    original: stableKitsuMediaUrl(image.original) ?? large,
  };
}

function normalizeResource(resource, includedIndex, identity) {
  const attributes = resource.attributes ?? {};
  const type = typeMap.get(String(attributes.subtype ?? "").toLocaleLowerCase("en-US"));
  const status = statusMap.get(String(attributes.status ?? "").toLocaleLowerCase("en-US"));
  const season = seasonFromDate(attributes.startDate);
  const poster = imageSet(attributes.posterImage);
  if (!attributes.canonicalTitle || !type || !status || !season || !poster || attributes.nsfw === true) return null;

  const scoreValue = Number(attributes.averageRating);
  const score = Number.isFinite(scoreValue) ? Math.round(scoreValue) / 10 : null;
  const episodeCount = Number(attributes.episodeCount);
  const episodeLength = Number(attributes.episodeLength);
  const rotaId = identity?.rotaId ?? `kitsu-${resource.id}`;
  const slug = identity?.slug ?? `${slugify(attributes.canonicalTitle)}-kitsu-${resource.id}`;

  return {
    id: rotaId,
    kitsuId: resource.id,
    slug,
    title: attributes.canonicalTitle,
    type,
    episodes: Number.isFinite(episodeCount) && episodeCount > 0 ? episodeCount : 0,
    status,
    season,
    durationSeconds: Number.isFinite(episodeLength) && episodeLength > 0 ? episodeLength * 60 : null,
    score,
    popularityRank: Number.isFinite(Number(attributes.popularityRank)) ? Number(attributes.popularityRank) : null,
    ratingRank: Number.isFinite(Number(attributes.ratingRank)) ? Number(attributes.ratingRank) : null,
    userCount: Number.isFinite(Number(attributes.userCount)) ? Number(attributes.userCount) : 0,
    synonyms: kitsuTitles(resource)
      .filter((title) => title !== attributes.canonicalTitle)
      .slice(0, 24),
    studios: studiosFor(resource, includedIndex),
    tags: tagsFor(resource, includedIndex),
    sources: [`https://kitsu.app/anime/${resource.id}`],
    poster: { provider: "kitsu", ...poster },
    cover: imageSet(attributes.coverImage),
  };
}

async function fetchListing(parameters, requestedCount, label) {
  const data = [];
  const included = [];
  const pages = Math.ceil(requestedCount / 20);
  for (let page = 0; page < pages; page += 1) {
    const response = await kitsuRequest("anime", {
      ...parameters,
      "page[limit]": 20,
      "page[offset]": page * 20,
      include: API_INCLUDE,
    });
    data.push(...response.data);
    included.push(...(response.included ?? []));
    process.stdout.write(`\r${label}: ${data.length}/${Math.min(requestedCount, response.meta?.count ?? requestedCount)}`);
    if (response.data.length < 20 || data.length >= (response.meta?.count ?? requestedCount)) break;
  }
  process.stdout.write("\n");
  return { data, included };
}

function mergePayloads(payloads) {
  const data = new Map();
  const included = new Map();
  for (const payload of payloads) {
    for (const resource of payload.data) data.set(`${resource.type}:${resource.id}`, resource);
    for (const resource of payload.included ?? []) included.set(`${resource.type}:${resource.id}`, resource);
  }
  return { data: [...data.values()], included: [...included.values()] };
}

function existingIdentityIndexes(catalogue) {
  const byKitsu = new Map();
  const byIdentity = new Map();
  for (const anime of catalogue.items) {
    const kitsuId = anime.kitsuId ?? legacyKitsuId(anime);
    if (kitsuId) byKitsu.set(String(kitsuId), { rotaId: anime.id, slug: anime.slug });
    const type = String(anime.type).toLocaleLowerCase("en-US");
    for (const title of [anime.title, ...(anime.synonyms ?? [])]) {
      const key = `${normalizeTitle(title)}|${anime.season?.year}|${type}`;
      const group = byIdentity.get(key) ?? [];
      group.push({ rotaId: anime.id, slug: anime.slug });
      byIdentity.set(key, group);
    }
  }
  return { byKitsu, byIdentity };
}

function identityForResource(resource, indexes, usedRotaIds) {
  const direct = indexes.byKitsu.get(resource.id);
  if (direct && !usedRotaIds.has(direct.rotaId)) return direct;

  const attributes = resource.attributes ?? {};
  const type = typeMap.get(String(attributes.subtype ?? "").toLocaleLowerCase("en-US"));
  const season = seasonFromDate(attributes.startDate);
  if (!type || !season) return null;
  for (const title of kitsuTitles(resource)) {
    const key = `${normalizeTitle(title)}|${season.year}|${type.toLocaleLowerCase("en-US")}`;
    const matches = indexes.byIdentity.get(key) ?? [];
    const available = matches.filter((match) => !usedRotaIds.has(match.rotaId));
    if (available.length === 1) return available[0];
  }
  return null;
}

async function bootstrapSeed(existingCatalogue) {
  const existingKitsuIds = existingCatalogue.items
    .map((anime) => anime.kitsuId ?? legacyKitsuId(anime))
    .filter(Boolean);
  console.log(`Fetching ${existingKitsuIds.length} directly mapped existing anime...`);
  const existingPayload = await fetchAnimeByIds(existingKitsuIds, { include: API_INCLUDE });
  const popularPayload = await fetchListing({ sort: "-userCount" }, 2_000, "Popular anime");
  const ratedPayload = await fetchListing({ sort: "-averageRating" }, 600, "Top-rated anime");
  const recentPayloads = [];
  for (let year = CURRENT_YEAR - 2; year <= CURRENT_YEAR + 1; year += 1) {
    recentPayloads.push(await fetchListing({ "filter[seasonYear]": year, sort: "-userCount" }, 400, `${year} anime`));
  }

  const merged = mergePayloads([existingPayload, popularPayload, ratedPayload, ...recentPayloads]);
  const includedIndex = indexIncluded(merged.included);
  const indexes = existingIdentityIndexes(existingCatalogue);
  const usedRotaIds = new Set();
  const normalizedByKitsu = new Map();
  for (const resource of merged.data) {
    const identity = identityForResource(resource, indexes, usedRotaIds);
    const normalized = normalizeResource(resource, includedIndex, identity);
    if (!normalized) continue;
    if (identity) usedRotaIds.add(identity.rotaId);
    normalizedByKitsu.set(resource.id, normalized);
  }

  const editorial = await readJson(resolve("src/data/editorial.json"));
  const editorialIds = new Set(editorial.entries.map((entry) => entry.animeId));
  const selected = new Map();
  const add = (items, maximum = TARGET_ITEMS) => {
    for (const anime of items) {
      if (selected.size >= maximum) break;
      selected.set(anime.kitsuId, anime);
    }
  };

  const normalized = [...normalizedByKitsu.values()];
  const editorialAnime = normalized.filter((anime) => editorialIds.has(anime.id));
  if (editorialAnime.length !== editorialIds.size) {
    const missing = [...editorialIds].filter((id) => !editorialAnime.some((anime) => anime.id === id));
    throw new Error(`Kitsu bootstrap cannot preserve editorial anime IDs: ${missing.join(", ")}`);
  }
  add(editorialAnime);

  const existingOrder = new Map(existingCatalogue.items.map((anime, index) => [anime.id, index]));
  const preserved = normalized
    .filter((anime) => existingOrder.has(anime.id))
    .sort((left, right) => existingOrder.get(left.id) - existingOrder.get(right.id));
  add(preserved);

  const popular = [...normalized].sort((left, right) => right.userCount - left.userCount);
  add(popular, 2_000);

  const recent = normalized
    .filter((anime) => anime.season.year >= CURRENT_YEAR - 2)
    .sort((left, right) => right.season.year - left.season.year || right.userCount - left.userCount);
  add(recent, 2_400);

  const rated = [...normalized]
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0) || right.userCount - left.userCount);
  add(rated);
  add(popular);

  if (selected.size !== TARGET_ITEMS) {
    throw new Error(`Kitsu bootstrap produced ${selected.size}/${TARGET_ITEMS} poster-complete anime.`);
  }

  const items = [...selected.values()];
  const seed = {
    meta: {
      source: "Kitsu API",
      generatedAt: new Date().toISOString(),
      targetCount: TARGET_ITEMS,
      preservedRotaIds: items.filter((anime) => existingOrder.has(anime.id)).length,
      selection: "Poster-complete existing Rota matches, popular Kitsu titles, recent/upcoming seasons, then high-rated titles.",
    },
    entries: items.map((anime) => ({ rotaId: anime.id, kitsuId: anime.kitsuId, slug: anime.slug })),
  };
  await writeFile(SEED_OUTPUT, `${JSON.stringify(seed, null, 2)}\n`, "utf8");
  console.log(`Wrote ${seed.entries.length} stable Kitsu identities to ${SEED_OUTPUT}.`);
  return { seed, payload: merged };
}

async function refreshFromSeed(seed) {
  const kitsuIds = seed.entries.map((entry) => entry.kitsuId);
  console.log(`Refreshing ${kitsuIds.length} seeded Kitsu anime...`);
  const payload = await fetchAnimeByIds(kitsuIds, { include: API_INCLUDE });
  return { seed, payload };
}

const existingCatalogue = await readJson(OUTPUT);
const existingSeed = RESEED ? null : await readOptionalJson(SEED_OUTPUT);
const { seed, payload } = existingSeed
  ? await refreshFromSeed(existingSeed)
  : await bootstrapSeed(existingCatalogue);
const includedIndex = indexIncluded(payload.included);
const resourcesById = new Map(payload.data.map((resource) => [resource.id, resource]));
const items = [];
const failures = [];
for (const identity of seed.entries) {
  const resource = resourcesById.get(String(identity.kitsuId));
  if (!resource) {
    failures.push(`${identity.rotaId}: missing Kitsu ${identity.kitsuId}`);
    continue;
  }
  const normalized = normalizeResource(resource, includedIndex, identity);
  if (!normalized) {
    failures.push(`${identity.rotaId}: incomplete or missing poster (${identity.kitsuId})`);
    continue;
  }
  items.push(normalized);
}

if (failures.length || items.length !== TARGET_ITEMS) {
  throw new Error(`Kitsu refresh rejected; last-known-good catalogue was not replaced.\n${failures.slice(0, 30).join("\n")}`);
}

const updatedDates = payload.data
  .map((resource) => resource.attributes?.updatedAt)
  .filter(Boolean)
  .sort();
const upstreamSummary = await kitsuRequest("anime", { "page[limit]": 1 });
const output = {
  meta: {
    source: "https://kitsu.io/api/edge/anime",
    provider: "Kitsu",
    release: "REST API",
    lastUpdate: updatedDates.at(-1)?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    terms: {
      name: "Kitsu Terms of Service",
      url: "https://kitsu.app/terms",
    },
    originalEntryCount: upstreamSummary.meta?.count ?? null,
    entryCount: items.length,
    posterCoverage: items.filter((anime) => anime.poster?.large).length,
    selection: seed.meta.selection,
  },
  items,
};

await writeFile(OUTPUT, `${JSON.stringify(output)}\n`, "utf8");
console.log(`Wrote ${items.length} Kitsu anime with ${output.meta.posterCoverage}/${items.length} poster coverage to ${OUTPUT}.`);
