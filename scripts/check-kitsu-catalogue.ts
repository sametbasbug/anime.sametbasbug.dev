import assert from "node:assert/strict";
import rawCatalogue from "../src/data/catalogue.json";
import rawSeed from "../src/data/kitsu-catalogue-seed.json";
import rawEditorial from "../src/data/editorial.json";

const items = rawCatalogue.items;
const expectedCount = 2_500;
const ids = new Set(items.map((anime) => anime.id));
const slugs = new Set(items.map((anime) => anime.slug));
const kitsuIds = new Set(items.map((anime) => anime.kitsuId));
const malMapped = items.filter((anime) => anime.malId !== null);

assert.equal(rawCatalogue.meta.provider, "Kitsu");
assert.equal(rawCatalogue.meta.entryCount, expectedCount);
assert.equal(rawCatalogue.meta.posterCoverage, expectedCount);
assert.equal(items.length, expectedCount);
assert.equal(ids.size, expectedCount, "Rota anime IDs must be unique");
assert.equal(slugs.size, expectedCount, "Anime slugs must be unique");
assert.equal(kitsuIds.size, expectedCount, "Kitsu IDs must be unique");
assert.equal(rawCatalogue.meta.malIdCoverage, malMapped.length);

for (const anime of items) {
  assert.ok(anime.id && anime.kitsuId && anime.slug && anime.title);
  assert.ok(anime.malId === null || /^\d+$/.test(anime.malId));
  assert.ok(["TV", "MOVIE", "OVA", "ONA", "SPECIAL"].includes(anime.type));
  assert.ok(["FINISHED", "ONGOING", "UPCOMING"].includes(anime.status));
  assert.ok(Number.isInteger(anime.season.year));
  assert.equal(anime.poster.provider, "kitsu");
  for (const url of [anime.poster.small, anime.poster.medium, anime.poster.large, anime.poster.original].filter(Boolean)) {
    assert.equal(new URL(url).hostname, "media.kitsu.app", `${anime.id} has a non-Kitsu poster URL`);
  }
  assert.deepEqual(anime.sources, [`https://kitsu.app/anime/${anime.kitsuId}`]);
}

assert.equal(rawSeed.entries.length, expectedCount);
assert.equal(new Set(rawSeed.entries.map((entry) => entry.rotaId)).size, expectedCount);
assert.equal(new Set(rawSeed.entries.map((entry) => entry.kitsuId)).size, expectedCount);
for (const entry of rawSeed.entries) {
  const anime = items.find((item) => item.id === entry.rotaId);
  assert.ok(anime, `Seeded Rota ID is missing from catalogue: ${entry.rotaId}`);
  assert.equal(anime.kitsuId, entry.kitsuId);
  assert.equal(anime.slug, entry.slug);
}

for (const editorial of rawEditorial.entries) {
  assert.ok(ids.has(editorial.animeId), `Editorial anime is missing after Kitsu migration: ${editorial.animeId}`);
}

const essentialKitsuIds = [
  "11", // Naruto
  "12", // One Piece
  "21", // Neon Genesis Evangelion
  "489", // Sailor Moon
  "720", // Dragon Ball Z
  "1376", // Death Note
  "3936", // Fullmetal Alchemist: Brotherhood
  "5646", // Steins;Gate
  "6448", // Hunter x Hunter (2011)
  "7442", // Attack on Titan
  "41370", // Demon Slayer
  "42765", // Jujutsu Kaisen
];
for (const kitsuId of essentialKitsuIds) {
  assert.ok(kitsuIds.has(kitsuId), `Essential anime is missing from the catalogue: Kitsu ${kitsuId}`);
}

console.log(`Kitsu kataloğu doğrulandı: ${items.length} anime, ${items.length}/${items.length} poster, ${malMapped.length} MAL eşlemesi, ${rawEditorial.entries.length} editoryal bağ.`);
