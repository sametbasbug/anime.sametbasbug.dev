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
import { CLOUD_MAX_ROWS, CloudPagingError } from "../src/lib/cloud-paging";
import { pagedSelect } from "./lib/fake-postgrest";

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

function useDevice(storage: MemoryStorage) {
  browser.localStorage = storage;
}

function seedDevice(storage: MemoryStorage, store: PersonalListStore) {
  storage.setItem(PERSONAL_LIST_STORAGE_KEY, JSON.stringify(store));
}

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
const editedAt = readPersonalList().entries.legacy.updatedAt;

removePersonalEntry("legacy");
assert.equal(readPersonalList().entries.legacy, undefined);
assert.ok(readPersonalList().tombstones.legacy);
assert.ok(Date.parse(readPersonalList().tombstones.legacy) > Date.parse(editedAt));

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
function createFakeClient(rows: unknown[], rejectedIds: string[] = [], errorCode = "23514", serverMaxRows = 3) {
  const requests: FakeRow[][] = [];
  const accepted: FakeRow[] = [];

  const client = {
    from() {
      return {
        select: pagedSelect(rows, serverMaxRows),
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

function createStatefulFakeClient(initialRows: FakeRow[] = []) {
  const rows = new Map(initialRows.map((row) => [row.anime_id as string, structuredClone(row)]));

  const client = {
    from() {
      return {
        select: pagedSelect(() => [...rows.values()].map((row) => structuredClone(row))),
        async upsert(batch: FakeRow[]) {
          for (const row of batch) rows.set(row.anime_id as string, structuredClone(row));
          return { error: null };
        },
      };
    },
  };

  return { client, rows };
}

function createVersionGuardedFakeClient(initialRows: FakeRow[] = []) {
  const rows = new Map(initialRows.map((row) => [row.anime_id as string, structuredClone(row)]));

  const client = {
    from() {
      return {
        select: pagedSelect(() => [...rows.values()].map((row) => structuredClone(row))),
        async upsert(batch: FakeRow[]) {
          for (const row of batch) {
            const animeId = row.anime_id as string;
            const current = rows.get(animeId);
            const incomingTime = Date.parse(row.client_updated_at as string);
            const currentTime = current ? Date.parse(current.client_updated_at as string) : Number.NEGATIVE_INFINITY;
            if (incomingTime >= currentTime) rows.set(animeId, structuredClone(row));
          }
          return { error: null };
        },
      };
    },
  };

  return { client, rows };
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

// İndirme başarılı, gönderme başarısız olursa buluttan alınan yeni kayıt yine
// cihazda kalır. Bir sonraki deneme yalnız gönderilemeyen yerel farkı taşır.
const interruptedStore: PersonalListStore = {
  version: 2,
  entries: {
    upload_waiting: {
      animeId: "upload_waiting",
      status: "PLANNED",
      progress: 0,
      score: null,
      note: "Bağlantı gelince gönder",
      updatedAt: "2026-08-07T13:00:00.000Z",
    },
  },
  tombstones: {},
};
seedDevice(localStorage, interruptedStore);
useDevice(localStorage);
const interrupted = createFakeClient([{
  anime_id: "download_first",
  status: "COMPLETED",
  progress: 12,
  score: 8,
  note: "Buluttan geldi",
  client_updated_at: "2026-08-07T12:00:00+00:00",
  deleted_at: null,
}], ["upload_waiting"], "42501");
await assert.rejects(() => syncPersonalList(interrupted.client as never, "user-1"));
assert.equal(readPersonalList().entries.download_first.note, "Buluttan geldi");
assert.equal(readPersonalList().entries.upload_waiting.note, "Bağlantı gelince gönder");

// Büyük arşivler tek dev istek yerine 200 kayıtlık parçalara ayrılır.
const largeEntries = Object.fromEntries(Array.from({ length: 201 }, (_, index) => {
  const animeId = `large_${index}`;
  return [animeId, {
    animeId,
    status: "PLANNED" as const,
    progress: 0,
    score: null,
    note: "",
    updatedAt: "2026-08-07T13:00:00.000Z",
  }];
}));
seedDevice(localStorage, { version: 2, entries: largeEntries, tombstones: {} });
const chunked = createFakeClient([]);
assert.deepEqual(
  await syncPersonalList(chunked.client as never, "user-1"),
  { downloaded: 0, uploaded: 201, rejected: [] },
);
assert.deepEqual(chunked.requests.map((batch) => batch.length), [200, 1]);

// İki bağımsız cihaz sırayla çevrimiçi olduğunda birleşme aynı arşive yakınsar.
// Bu tur tek bir sync çağrısının iç mantığını değil, gerçek kullanım sırasını
// taklit eder: A yükler, B indirip kendi kaydını yükler, A son farkı indirir.
const deviceA = new MemoryStorage();
const deviceB = new MemoryStorage();
seedDevice(deviceA, {
  version: 2,
  entries: {
    a_only: {
      animeId: "a_only",
      status: "WATCHING",
      progress: 3,
      score: 8,
      note: "A cihazı",
      updatedAt: "2026-08-07T12:00:00.000Z",
    },
    shared: {
      animeId: "shared",
      status: "COMPLETED",
      progress: 24,
      score: 9,
      note: "A'daki daha yeni düzenleme",
      updatedAt: "2026-08-07T13:00:00.000Z",
    },
  },
  tombstones: {},
});
seedDevice(deviceB, {
  version: 2,
  entries: {
    b_only: {
      animeId: "b_only",
      status: "PLANNED",
      progress: 0,
      score: null,
      note: "B cihazı",
      updatedAt: "2026-08-07T12:30:00.000Z",
    },
    shared: {
      animeId: "shared",
      status: "WATCHING",
      progress: 8,
      score: null,
      note: "B'deki eski düzenleme",
      updatedAt: "2026-08-07T11:00:00.000Z",
    },
  },
  tombstones: {},
});

const statefulCloud = createStatefulFakeClient();
useDevice(deviceA);
assert.deepEqual(
  await syncPersonalList(statefulCloud.client as never, "user-1"),
  { downloaded: 0, uploaded: 2, rejected: [] },
);
useDevice(deviceB);
assert.deepEqual(
  await syncPersonalList(statefulCloud.client as never, "user-1"),
  { downloaded: 2, uploaded: 1, rejected: [] },
);
useDevice(deviceA);
assert.deepEqual(
  await syncPersonalList(statefulCloud.client as never, "user-1"),
  { downloaded: 1, uploaded: 0, rejected: [] },
);

const convergedA = readPersonalList();
useDevice(deviceB);
const convergedB = readPersonalList();
assert.deepEqual(convergedA, convergedB);
assert.deepEqual(Object.keys(convergedA.entries).sort(), ["a_only", "b_only", "shared"]);
assert.equal(convergedA.entries.shared.note, "A'daki daha yeni düzenleme");

// A çevrimdışıyken siler ve sonra buluta yollar. Eski canlı kaydı taşıyan B
// daha sonra bağlandığında tombstone'u indirir; silinen animeyi geri yüklemez.
seedDevice(deviceA, {
  version: 2,
  entries: {},
  tombstones: { erased: "2026-08-07T15:00:00.000Z" },
});
seedDevice(deviceB, {
  version: 2,
  entries: {
    erased: {
      animeId: "erased",
      status: "WATCHING",
      progress: 6,
      score: null,
      note: "Çevrimdışı kalmış eski kayıt",
      updatedAt: "2026-08-07T14:00:00.000Z",
    },
  },
  tombstones: {},
});
const deletionCloud = createStatefulFakeClient([{
  user_id: "user-1",
  anime_id: "erased",
  status: "WATCHING",
  progress: 6,
  score: null,
  note: "Eski bulut kaydı",
  client_updated_at: "2026-08-07T14:00:00+00:00",
  deleted_at: null,
}]);

useDevice(deviceA);
assert.deepEqual(
  await syncPersonalList(deletionCloud.client as never, "user-1"),
  { downloaded: 0, uploaded: 1, rejected: [] },
);
useDevice(deviceB);
assert.deepEqual(
  await syncPersonalList(deletionCloud.client as never, "user-1"),
  { downloaded: 1, uploaded: 0, rejected: [] },
);
const deletedOnB = readPersonalList();
assert.equal(deletedOnB.entries.erased, undefined);
assert.equal(deletedOnB.tombstones.erased, "2026-08-07T15:00:00.000Z");
assert.equal(deletionCloud.rows.get("erased")?.deleted_at, "2026-08-07T15:00:00.000Z");

// İki cihaz aynı eski bulut anlık görüntüsünü okuyup aynı anda yüklese bile
// veritabanı koruması daha sonra ulaşan eski sürümü atlar. B'nin sonraki turu
// A'nın yeni sürümünü indirerek yakınsar.
seedDevice(deviceA, {
  version: 2,
  entries: {
    concurrent: {
      animeId: "concurrent",
      status: "COMPLETED",
      progress: 24,
      score: 9,
      note: "Yeni sürüm",
      updatedAt: "2026-08-07T17:00:00.000Z",
    },
  },
  tombstones: {},
});
seedDevice(deviceB, {
  version: 2,
  entries: {
    concurrent: {
      animeId: "concurrent",
      status: "WATCHING",
      progress: 4,
      score: null,
      note: "Eski sürüm",
      updatedAt: "2026-08-07T16:00:00.000Z",
    },
  },
  tombstones: {},
});
const guardedCloud = createVersionGuardedFakeClient();
useDevice(deviceA);
const concurrentA = syncPersonalList(guardedCloud.client as never, "user-1");
useDevice(deviceB);
const concurrentB = syncPersonalList(guardedCloud.client as never, "user-1");
await Promise.all([concurrentA, concurrentB]);
assert.equal(guardedCloud.rows.get("concurrent")?.note, "Yeni sürüm");

useDevice(deviceB);
assert.deepEqual(
  await syncPersonalList(guardedCloud.client as never, "user-1"),
  { downloaded: 1, uploaded: 0, rejected: [] },
);
assert.equal(readPersonalList().entries.concurrent.note, "Yeni sürüm");

/* Sunucu tavanı ile sayfalama.
 *
 * Düzeltilen hata şuydu: sayfalamasız `select`, PostgREST'in `max-rows`
 * tavanında sessizce kırpılıyordu. Sunucu hata vermediği için kırpma hiçbir
 * yerde görünmüyor, eksik satırlar o cihazda bir daha hiç inmiyordu.
 *
 * Aşağıdaki sahte sunucu istek başına en fazla 3 satır döndürüyor; 17 satırın
 * tamamının inmesi ancak sayfalama gerçekten çalışıyorsa mümkün. */
const tavanliSatirlar = Array.from({ length: 17 }, (_, index) => ({
  anime_id: `sayfali_${String(index).padStart(2, "0")}`,
  status: "WATCHING",
  progress: index,
  score: null,
  note: "",
  client_updated_at: "2026-08-07T12:00:00+00:00",
  deleted_at: null,
}));

const sayfalamaCihazi = new MemoryStorage();
useDevice(sayfalamaCihazi);
seedDevice(sayfalamaCihazi, { version: 2, entries: {}, tombstones: {} });

const sayfali = createFakeClient(tavanliSatirlar);
assert.deepEqual(
  await syncPersonalList(sayfali.client as never, "user-1"),
  { downloaded: 17, uploaded: 0, rejected: [] },
  "sunucu tavanı sayfa başına 3 satırla sınırlıyken de 17 kaydın tamamı inmeli",
);
assert.equal(Object.keys(readPersonalList().entries).length, 17);
assert.ok(readPersonalList().entries.sayfali_16, "son sayfadaki kayıt da inmeli");

/* Güvenli okuma tavanı aşıldığında sessizce kırpmak yerine düşüyoruz. */
const tasanSatirlar = Array.from({ length: CLOUD_MAX_ROWS + 10 }, (_, index) => ({
  anime_id: `tasan_${index}`,
  status: "WATCHING",
  progress: 0,
  score: null,
  note: "",
  client_updated_at: "2026-08-07T12:00:00+00:00",
  deleted_at: null,
}));
/* Tavan testinde sayfa boyutu büyük: sınanan şey burada sayfalamanın
 * mekaniği değil, sınıra varınca DURMAK. */
const tasan = createFakeClient(tasanSatirlar, [], "23514", 5_000);
await assert.rejects(
  () => syncPersonalList(tasan.client as never, "user-1"),
  CloudPagingError,
  "güvenli okuma sınırı aşıldığında eşitleme eksik veriyle devam etmemeli",
);


console.log("Kişisel liste geçişi ve local-first senkronizasyonu doğrulandı.");
