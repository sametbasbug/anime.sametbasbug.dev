import assert from "node:assert/strict";
import {
  PERSONAL_LIST_STORAGE_KEY,
  readPersonalList,
  removePersonalEntry,
  writePersonalEntry,
  type PersonalListStore,
} from "../src/lib/personal-list";
import { syncPersonalList } from "../src/lib/cloud-sync";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const localStorage = new MemoryStorage();
const browser = new EventTarget() as EventTarget & { localStorage: MemoryStorage };
browser.localStorage = localStorage;
Object.assign(globalThis, { window: browser, localStorage });

localStorage.setItem(PERSONAL_LIST_STORAGE_KEY, JSON.stringify({
  version: 1,
  entries: {
    legacy: {
      animeId: "legacy",
      status: "WATCHING",
      progress: 4,
      score: 8,
      note: "Eski kayıt",
      updatedAt: "2026-08-07T08:00:00.000Z",
    },
  },
}));

const migrated = readPersonalList();
assert.equal(migrated.version, 2);
assert.equal(migrated.entries.legacy.progress, 4);
assert.deepEqual(migrated.tombstones, {});

writePersonalEntry({ ...migrated.entries.legacy, progress: 5 });
assert.equal(readPersonalList().version, 2);
assert.equal(readPersonalList().entries.legacy.progress, 5);

removePersonalEntry("legacy");
assert.equal(readPersonalList().entries.legacy, undefined);
assert.ok(readPersonalList().tombstones.legacy);

const local: PersonalListStore = {
  version: 2,
  entries: {
    local_newer: {
      animeId: "local_newer",
      status: "WATCHING",
      progress: 7,
      score: null,
      note: "Yerel",
      updatedAt: "2026-08-07T11:00:00.000Z",
    },
  },
  tombstones: {
    local_deleted: "2026-08-07T11:30:00.000Z",
  },
};
localStorage.setItem(PERSONAL_LIST_STORAGE_KEY, JSON.stringify(local));

const remoteRows = [
  {
    anime_id: "local_newer",
    status: "PLANNED",
    progress: 0,
    score: null,
    note: "Eski bulut",
    client_updated_at: "2026-08-07T10:00:00.000Z",
    deleted_at: null,
  },
  {
    anime_id: "remote_newer",
    status: "COMPLETED",
    progress: 24,
    score: 9,
    note: "Bulut",
    client_updated_at: "2026-08-07T12:00:00.000Z",
    deleted_at: null,
  },
  {
    anime_id: "local_deleted",
    status: "WATCHING",
    progress: 3,
    score: null,
    note: "Silinmeli",
    client_updated_at: "2026-08-07T10:30:00.000Z",
    deleted_at: null,
  },
];

const uploads: Record<string, unknown>[] = [];
const fakeClient = {
  from() {
    return {
      select() {
        return {
          async eq() {
            return { data: remoteRows, error: null };
          },
        };
      },
      async upsert(rows: Record<string, unknown>[]) {
        uploads.push(...rows);
        return { error: null };
      },
    };
  },
};

const result = await syncPersonalList(fakeClient as never, "user-1");
const merged = readPersonalList();

assert.deepEqual(result, { downloaded: 1, uploaded: 2 });
assert.equal(merged.entries.local_newer.progress, 7);
assert.equal(merged.entries.remote_newer.progress, 24);
assert.ok(merged.tombstones.local_deleted);
assert.equal(uploads.find((row) => row.anime_id === "local_newer")?.deleted_at, null);
assert.equal(uploads.find((row) => row.anime_id === "local_deleted")?.deleted_at, "2026-08-07T11:30:00.000Z");

console.log("Kişisel liste geçişi ve local-first senkronizasyonu doğrulandı.");
