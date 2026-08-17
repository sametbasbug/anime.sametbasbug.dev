import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_ITEMS,
  MAX_COLLECTION_NAME_LENGTH,
  PERSONAL_COLLECTIONS_STORAGE_KEY,
  PersonalCollectionError,
  createPersonalCollection,
  mergePersonalCollectionStores,
  moveAnimeInCollection,
  readPersonalCollections,
  removePersonalCollection,
  setAnimeInCollection,
  writePersonalCollection,
  type PersonalCollectionsStore,
} from "../src/lib/personal-collections";
import { syncPersonalCollections } from "../src/lib/collection-sync";

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

const currentForMerge: PersonalCollectionsStore = {
  version: 1,
  collections: {
    newer: { id: "newer", name: "Cihaz", description: "", color: "mint", animeIds: ["1"], createdAt: "2026-08-17T08:00:00.000Z", updatedAt: "2026-08-17T12:00:00.000Z" },
  },
  tombstones: { stays_deleted: "2026-08-17T13:00:00.000Z" },
};
const incomingForMerge: PersonalCollectionsStore = {
  version: 1,
  collections: {
    newer: { id: "newer", name: "Eski bulut", description: "", color: "coral", animeIds: [], createdAt: "2026-08-17T08:00:00.000Z", updatedAt: "2026-08-17T11:00:00.000Z" },
    added: { id: "added", name: "Bulut", description: "", color: "sky", animeIds: ["2"], createdAt: "2026-08-17T09:00:00.000Z", updatedAt: "2026-08-17T14:00:00.000Z" },
    stays_deleted: { id: "stays_deleted", name: "Dirilmemeli", description: "", color: "sun", animeIds: [], createdAt: "2026-08-17T08:00:00.000Z", updatedAt: "2026-08-17T12:30:00.000Z" },
  },
  tombstones: {},
};
const merge = mergePersonalCollectionStores(currentForMerge, incomingForMerge);
assert.deepEqual(merge.summary, { added: 1, updated: 0, deleted: 0, kept: 2 });
assert.equal(merge.store.collections.newer.name, "Cihaz");
assert.equal(merge.store.collections.added.color, "sky");
assert.equal(merge.store.collections.stays_deleted, undefined);

localStorage.setItem(PERSONAL_COLLECTIONS_STORAGE_KEY, JSON.stringify({
  version: 1,
  collections: {
    local_newer: { id: "local_newer", name: "Yerel", description: "", color: "mint", animeIds: ["55318"], createdAt: "2026-08-17T08:00:00.000Z", updatedAt: "2026-08-17T12:00:00.000Z" },
    same_instant: { id: "same_instant", name: "Aynı", description: "", color: "sky", animeIds: [], createdAt: "2026-08-17T08:00:00.000Z", updatedAt: "2026-08-17T12:00:00.000Z" },
  },
  tombstones: { local_deleted: "2026-08-17T13:00:00.000Z" },
} satisfies PersonalCollectionsStore));
const remoteRows = [
  { id: "local_newer", name: "Eski bulut", description: "", color: "coral", anime_ids: [], client_created_at: "2026-08-17T08:00:00+00:00", client_updated_at: "2026-08-17T11:00:00+00:00", deleted_at: null },
  { id: "same_instant", name: "Aynı", description: "", color: "sky", anime_ids: [], client_created_at: "2026-08-17T08:00:00+00:00", client_updated_at: "2026-08-17T12:00:00+00:00", deleted_at: null },
  { id: "remote_newer", name: "Bulut", description: "Yeni", color: "lavender", anime_ids: ["40748"], client_created_at: "2026-08-17T09:00:00+00:00", client_updated_at: "2026-08-17T14:00:00+00:00", deleted_at: null },
  { id: "local_deleted", name: "Silinecek", description: "", color: "sun", anime_ids: [], client_created_at: "2026-08-17T08:00:00+00:00", client_updated_at: "2026-08-17T12:30:00+00:00", deleted_at: null },
];
type FakeRow = Record<string, unknown>;
const accepted: FakeRow[] = [];
const client = {
  from(table: string) {
    assert.equal(table, "personal_collections");
    return {
      select() { return { async eq() { return { data: remoteRows, error: null }; } }; },
      async upsert(rows: FakeRow[]) { accepted.push(...rows); return { error: null }; },
    };
  },
};
const sync = await syncPersonalCollections(client as never, "user-1");
assert.deepEqual(sync, { downloaded: 1, uploaded: 2, rejected: [] });
assert.equal(readPersonalCollections().collections.remote_newer.name, "Bulut");
assert.equal(readPersonalCollections().collections.local_newer.name, "Yerel");
assert.equal(accepted.some((row) => row.id === "same_instant"), false);
assert.equal(accepted.find((row) => row.id === "local_deleted")?.deleted_at, "2026-08-17T13:00:00.000Z");

const migration = readFileSync(new URL("../supabase/migrations/202608170002_personal_collections.sql", import.meta.url), "utf8");
for (const rule of [
  "alter table public.personal_collections enable row level security",
  'create policy "personal_collections_select_own"',
  'create policy "personal_collections_insert_own"',
  'create policy "personal_collections_update_own"',
  'create policy "personal_collections_delete_own"',
  "revoke all on public.personal_collections from anon",
  "grant execute on function public.valid_collection_anime_ids(jsonb) to authenticated",
  "count(distinct item #>> '{}')",
  "keep_newer_personal_collection_version",
]) assert.ok(migration.includes(rule), `Koleksiyon migration'ında eksik koruma: ${rule}`);

const page = readFileSync(new URL("../src/pages/koleksiyonlar.astro", import.meta.url), "utf8");
const detail = readFileSync(new URL("../src/pages/anime/[slug].astro", import.meta.url), "utf8");
assert.ok(page.includes("CollectionsExperience"), "Koleksiyon yönetim yüzeyi route'a bağlı olmalı.");
assert.ok(detail.includes("CollectionPicker"), "Anime detayı koleksiyon seçicisini göstermeli.");

console.log("Kişisel koleksiyonların local-first modeli, sınırları, yedek birleşimi, senkronizasyonu ve RLS korumaları doğrulandı.");
