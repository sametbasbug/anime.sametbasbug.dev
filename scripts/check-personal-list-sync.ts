import assert from "node:assert/strict";
import {
  MAX_PROGRESS,
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

// Bölüm ilerlemesi sunucudaki üst sınırı aşamaz; aşarsa toplu upsert reddedilir.
writePersonalEntry({
  animeId: "cap",
  status: "WATCHING",
  progress: MAX_PROGRESS + 5000,
  score: null,
  note: "",
  updatedAt: "2026-08-07T09:00:00.000Z",
});
assert.equal(readPersonalList().entries.cap.progress, MAX_PROGRESS);

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
    same_instant: {
      animeId: "same_instant",
      status: "WATCHING",
      progress: 3,
      score: null,
      note: "Değişmedi",
      updatedAt: "2026-08-07T11:00:00.000Z",
    },
  },
  tombstones: {
    local_deleted: "2026-08-07T11:30:00.000Z",
  },
};
localStorage.setItem(PERSONAL_LIST_STORAGE_KEY, JSON.stringify(local));

// PostgREST timestamptz'i `+00:00` ofsetiyle ve sondaki sıfırları kırparak
// döndürür. Sahte satırlar bilerek bu biçimdedir; yerel kayıtlar `Z` biçiminde
// olduğu için metin karşılaştırması iki biçimi asla eşit görmez.
const remoteRows = [
  {
    anime_id: "local_newer",
    status: "PLANNED",
    progress: 0,
    score: null,
    note: "Eski bulut",
    client_updated_at: "2026-08-07T10:00:00+00:00",
    deleted_at: null,
  },
  {
    anime_id: "same_instant",
    status: "WATCHING",
    progress: 3,
    score: null,
    note: "Değişmedi",
    client_updated_at: "2026-08-07T11:00:00+00:00",
    deleted_at: null,
  },
  {
    anime_id: "remote_newer",
    status: "COMPLETED",
    progress: 24,
    score: 9,
    note: "Bulut",
    client_updated_at: "2026-08-07T12:00:00+00:00",
    deleted_at: null,
  },
  {
    anime_id: "local_deleted",
    status: "WATCHING",
    progress: 3,
    score: null,
    note: "Silinmeli",
    client_updated_at: "2026-08-07T10:30:00+00:00",
    deleted_at: null,
  },
];

type FakeRow = Record<string, unknown>;

/**
 * `rejectedIds` içindeki bir kayıt gönderime dahilse Supabase'in kısıt ihlali
 * yanıtını taklit eder: istek tümüyle reddedilir, tek satır bile olsa.
 */
function createFakeClient(rows: unknown[], rejectedIds: string[] = [], errorCode = "23514") {
  const requests: FakeRow[][] = [];
  const accepted: FakeRow[] = [];

  const client = {
    from() {
      return {
        select() {
          return {
            async eq() {
              return { data: rows, error: null };
            },
          };
        },
        async upsert(batch: FakeRow[]) {
          requests.push(batch);
          if (batch.some((row) => rejectedIds.includes(row.anime_id as string))) {
            return { error: { code: errorCode, message: "kısıt ihlali" } };
          }
          accepted.push(...batch);
          return { error: null };
        },
      };
    },
  };

  return { client, requests, accepted };
}

const merge = createFakeClient(remoteRows);
const uploads = merge.accepted;

const result = await syncPersonalList(merge.client as never, "user-1");
const merged = readPersonalList();

assert.deepEqual(result, { downloaded: 1, uploaded: 2, rejected: [] });
assert.equal(merged.entries.local_newer.progress, 7);
assert.equal(merged.entries.remote_newer.progress, 24);
assert.ok(merged.tombstones.local_deleted);
// Aynı an, farklı biçim: ne indirilir ne de yeniden yüklenir.
assert.equal(uploads.some((row) => row.anime_id === "same_instant"), false);
assert.equal(merged.entries.same_instant.note, "Değişmedi");
assert.equal(uploads.find((row) => row.anime_id === "local_newer")?.deleted_at, null);
assert.equal(uploads.find((row) => row.anime_id === "local_deleted")?.deleted_at, "2026-08-07T11:30:00.000Z");

// Reddedilen tek satır, geri kalan kayıtların gönderimini engellemez.
const withBadRow: PersonalListStore = {
  version: 2,
  entries: {
    saglam_bir: {
      animeId: "saglam_bir",
      status: "WATCHING",
      progress: 2,
      score: null,
      note: "",
      updatedAt: "2026-08-07T11:00:00.000Z",
    },
    bozuk: {
      animeId: "bozuk",
      status: "WATCHING",
      progress: 4,
      score: null,
      note: "",
      updatedAt: "2026-08-07T11:00:00.000Z",
    },
    saglam_iki: {
      animeId: "saglam_iki",
      status: "COMPLETED",
      progress: 12,
      score: 7,
      note: "",
      updatedAt: "2026-08-07T11:00:00.000Z",
    },
  },
  tombstones: {},
};
localStorage.setItem(PERSONAL_LIST_STORAGE_KEY, JSON.stringify(withBadRow));

const partial = createFakeClient([], ["bozuk"]);
const partialResult = await syncPersonalList(partial.client as never, "user-1");

assert.deepEqual(partialResult, { downloaded: 0, uploaded: 2, rejected: ["bozuk"] });
assert.equal(partial.accepted.length, 2);
// Önce toplu gönderim denenir, reddedilince satırlar tek tek yalıtılır.
assert.equal(partial.requests[0].length, 3);
assert.deepEqual(partial.requests.slice(1).map((batch) => batch.length), [1, 1, 1]);
// Reddedilen kayıt yerelde durur; kullanıcı verisi sessizce silinmez.
assert.equal(readPersonalList().entries.bozuk.progress, 4);

// Satır dışı hatalarda (RLS, JWT, ağ) tek tek yeniden deneme yapılmaz.
localStorage.setItem(PERSONAL_LIST_STORAGE_KEY, JSON.stringify(withBadRow));
const denied = createFakeClient([], ["bozuk"], "42501");
await assert.rejects(() => syncPersonalList(denied.client as never, "user-1"));
assert.equal(denied.requests.length, 1);

console.log("Kişisel liste geçişi ve local-first senkronizasyonu doğrulandı.");
