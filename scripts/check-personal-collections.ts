import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_ITEMS,
  MAX_COLLECTION_NAME_LENGTH,
  PERSONAL_COLLECTIONS_STORAGE_KEY,
  PersonalCollectionError,
  createPersonalCollection,
  moveAnimeInCollection,
  readPersonalCollections,
  removePersonalCollection,
  setAnimeInCollection,
  writePersonalCollection,
  type PersonalCollectionsStore,
} from "../src/lib/personal-collections";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const localStorage = new MemoryStorage();
const browser = new EventTarget() as EventTarget & { localStorage: MemoryStorage };
browser.localStorage = localStorage;
Object.assign(globalThis, { window: browser, localStorage });

const original: PersonalCollectionsStore = {
  version: 1,
  collections: {
    comfort: {
      id: "comfort",
      name: "  İçimi   ısıtanlar  ",
      description: "x".repeat(MAX_COLLECTION_DESCRIPTION_LENGTH + 20),
      color: "mint",
      animeIds: ["1", "1", "2", ...Array.from({ length: MAX_COLLECTION_ITEMS + 10 }, (_, index) => `anime-${index}`)],
      createdAt: "2026-08-17T00:00:00.000Z",
      updatedAt: "2026-08-17T01:00:00.000Z",
    },
  },
  tombstones: { old: "2026-08-17T02:00:00.000Z" },
};
localStorage.setItem(PERSONAL_COLLECTIONS_STORAGE_KEY, JSON.stringify(original));

const sanitized = readPersonalCollections();
assert.equal(sanitized.collections.comfort.name, "İçimi ısıtanlar");
assert.equal(sanitized.collections.comfort.description.length, MAX_COLLECTION_DESCRIPTION_LENGTH);
assert.equal(sanitized.collections.comfort.animeIds.length, MAX_COLLECTION_ITEMS);
assert.deepEqual(sanitized.tombstones, original.tombstones);

const created = createPersonalCollection({ name: "  Gece rotaları ", description: "Sessiz ve karanlık dünyalar.", color: "lavender" });
assert.equal(created.name, "Gece rotaları");
assert.equal(readPersonalCollections().collections[created.id].animeIds.length, 0);

const added = setAnimeInCollection(created.id, "55318", true);
setAnimeInCollection(created.id, "40748", true);
assert.deepEqual(readPersonalCollections().collections[created.id].animeIds, ["55318", "40748"]);
assert.ok(Date.parse(added.updatedAt) > Date.parse(created.updatedAt));

moveAnimeInCollection(created.id, "40748", -1);
assert.deepEqual(readPersonalCollections().collections[created.id].animeIds, ["40748", "55318"]);
setAnimeInCollection(created.id, "40748", false);
assert.deepEqual(readPersonalCollections().collections[created.id].animeIds, ["55318"]);

const renamed = writePersonalCollection({ ...readPersonalCollections().collections[created.id], name: "n".repeat(MAX_COLLECTION_NAME_LENGTH + 20) });
assert.equal(renamed.name.length, MAX_COLLECTION_NAME_LENGTH);
removePersonalCollection(created.id);
const removed = readPersonalCollections();
assert.equal(removed.collections[created.id], undefined);
assert.ok(Date.parse(removed.tombstones[created.id]) > Date.parse(renamed.updatedAt));

assert.throws(
  () => writePersonalCollection({ ...original.collections.comfort, id: "invalid", name: "   " }),
  PersonalCollectionError,
);

const page = readFileSync(new URL("../src/pages/koleksiyonlar.astro", import.meta.url), "utf8");
const detail = readFileSync(new URL("../src/pages/anime/[slug].astro", import.meta.url), "utf8");
assert.ok(page.includes("CollectionsExperience"), "Koleksiyon yönetim yüzeyi route'a bağlı olmalı.");
assert.ok(detail.includes("CollectionPicker"), "Anime detayı koleksiyon seçicisini göstermeli.");

console.log("Kişisel koleksiyonların local-first modeli, sınırları, sıralaması ve tombstone davranışı doğrulandı.");
