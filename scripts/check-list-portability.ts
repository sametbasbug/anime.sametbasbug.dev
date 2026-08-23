import assert from "node:assert/strict";
import type { CatalogueAnime } from "../src/lib/catalogue-ui";
import {
  ROTA_BACKUP_FORMAT,
  ROTA_BACKUP_VERSION,
  RotaBackupError,
  createPersonalListCsv,
  mergePersonalListStores,
  mergeWatchJournalStores,
  parseRotaArchive,
  parseRotaBackup,
  serializeRotaBackup,
} from "../src/lib/list-portability";
import type { PersonalListStore } from "../src/lib/personal-list";
import type { WatchJournalStore } from "../src/lib/watch-journal";
import { mergePersonalCollectionStores, type PersonalCollectionsStore } from "../src/lib/personal-collections";
import { ExternalListImportError, createExternalListPreview } from "../src/lib/external-list-import";

const current: PersonalListStore = {
  version: 2,
  entries: {
    newer_here: { animeId: "newer_here", status: "WATCHING", progress: 8, score: 9, note: "Cihaz", updatedAt: "2026-08-13T09:00:00.000Z" },
    replaced: { animeId: "replaced", status: "PLANNED", progress: 0, score: null, note: "Eski", updatedAt: "2026-08-12T09:00:00.000Z" },
    deleted_by_backup: { animeId: "deleted_by_backup", status: "WATCHING", progress: 2, score: null, note: "", updatedAt: "2026-08-11T09:00:00.000Z" },
  },
  tombstones: { stays_deleted: "2026-08-13T10:00:00.000Z" },
};

const backupStore: PersonalListStore = {
  version: 2,
  entries: {
    newer_here: { animeId: "newer_here", status: "COMPLETED", progress: 12, score: 10, note: "Eski yedek", updatedAt: "2026-08-12T08:00:00.000Z" },
    replaced: { animeId: "replaced", status: "WATCHING", progress: 4, score: 7, note: "Yedek", updatedAt: "2026-08-13T08:00:00.000Z" },
    added: { animeId: "added", status: "PLANNED", progress: 0, score: null, note: "Yeni", updatedAt: "2026-08-13T07:00:00.000Z" },
    stays_deleted: { animeId: "stays_deleted", status: "WATCHING", progress: 1, score: null, note: "Dirilmemeli", updatedAt: "2026-08-12T07:00:00.000Z" },
  },
  tombstones: { deleted_by_backup: "2026-08-13T11:00:00.000Z" },
};

const currentJournal: WatchJournalStore = {
  version: 1,
  entries: {
    journal_newer_here: { id: "journal_newer_here", animeId: "added", episodeStart: 1, episodeEnd: 2, watchedOn: "2026-08-13", note: "Cihaz günlüğü", createdAt: "2026-08-13T08:00:00.000Z", updatedAt: "2026-08-13T10:00:00.000Z" },
  },
  tombstones: { journal_stays_deleted: "2026-08-13T10:30:00.000Z" },
};

const backupJournal: WatchJournalStore = {
  version: 1,
  entries: {
    journal_newer_here: { id: "journal_newer_here", animeId: "added", episodeStart: 1, episodeEnd: 1, watchedOn: "2026-08-12", note: "Eski günlük", createdAt: "2026-08-12T08:00:00.000Z", updatedAt: "2026-08-12T09:00:00.000Z" },
    journal_added: { id: "journal_added", animeId: "added", episodeStart: 3, episodeEnd: 4, watchedOn: "2026-08-13", note: "Yeni günlük", createdAt: "2026-08-13T08:00:00.000Z", updatedAt: "2026-08-13T09:00:00.000Z" },
    journal_stays_deleted: { id: "journal_stays_deleted", animeId: "added", episodeStart: 5, episodeEnd: 5, watchedOn: "2026-08-12", note: "Dirilmemeli", createdAt: "2026-08-12T07:00:00.000Z", updatedAt: "2026-08-12T07:00:00.000Z" },
  },
  tombstones: {},
};

const currentCollections: PersonalCollectionsStore = {
  version: 1,
  collections: {
    collection_newer_here: { id: "collection_newer_here", name: "Cihaz", description: "", color: "mint", animeIds: ["newer_here"], createdAt: "2026-08-12T08:00:00.000Z", updatedAt: "2026-08-13T10:00:00.000Z" },
  },
  tombstones: { collection_stays_deleted: "2026-08-13T10:30:00.000Z" },
};

const backupCollections: PersonalCollectionsStore = {
  version: 1,
  collections: {
    collection_newer_here: { id: "collection_newer_here", name: "Eski yedek", description: "", color: "coral", animeIds: ["added"], createdAt: "2026-08-12T08:00:00.000Z", updatedAt: "2026-08-12T09:00:00.000Z" },
    collection_added: { id: "collection_added", name: "Filmler", description: "Seçtiklerim", color: "sky", animeIds: ["added"], createdAt: "2026-08-13T08:00:00.000Z", updatedAt: "2026-08-13T09:00:00.000Z" },
    collection_stays_deleted: { id: "collection_stays_deleted", name: "Dirilmemeli", description: "", color: "sun", animeIds: [], createdAt: "2026-08-12T07:00:00.000Z", updatedAt: "2026-08-12T07:00:00.000Z" },
  },
  tombstones: {},
};

const raw = serializeRotaBackup(backupStore, "2026-08-13T12:00:00.000Z", backupJournal, backupCollections);
const document = JSON.parse(raw);
assert.equal(document.format, ROTA_BACKUP_FORMAT);
assert.equal(document.version, ROTA_BACKUP_VERSION);
assert.deepEqual(parseRotaBackup(raw), backupStore);
assert.deepEqual(parseRotaArchive(raw).journal, backupJournal);
assert.deepEqual(parseRotaArchive(raw).collections, backupCollections);

const legacyDocument = { ...document, version: 1 };
delete legacyDocument.journalEntries;
delete legacyDocument.journalTombstones;
assert.deepEqual(parseRotaArchive(JSON.stringify(legacyDocument)).journal, { version: 1, entries: {}, tombstones: {} }, "Eski v1 yedekleri günlük olmadan okunmalı.");
assert.deepEqual(parseRotaArchive(JSON.stringify(legacyDocument)).collections, { version: 1, collections: {}, tombstones: {} }, "Eski v1 yedekleri koleksiyon olmadan okunmalı.");
const versionTwoDocument = { ...document, version: 2 };
delete versionTwoDocument.collections;
delete versionTwoDocument.collectionTombstones;
assert.deepEqual(parseRotaArchive(JSON.stringify(versionTwoDocument)).collections, { version: 1, collections: {}, tombstones: {} }, "Eski v2 yedekleri koleksiyon olmadan okunmalı.");

const { store: merged, summary } = mergePersonalListStores(current, parseRotaBackup(raw));
assert.deepEqual(summary, { added: 1, updated: 1, deleted: 1, kept: 2 });
assert.equal(merged.entries.newer_here.note, "Cihaz", "Daha yeni cihaz kaydı yedekle ezilmemeli.");
assert.equal(merged.entries.replaced.note, "Yedek");
assert.equal(merged.entries.added.status, "PLANNED");
assert.equal(merged.entries.deleted_by_backup, undefined);
assert.equal(merged.tombstones.deleted_by_backup, "2026-08-13T11:00:00.000Z");
assert.equal(merged.entries.stays_deleted, undefined, "Daha yeni tombstone eski yedek kaydını diriltmemeli.");

const { store: mergedJournal, summary: journalSummary } = mergeWatchJournalStores(currentJournal, parseRotaArchive(raw).journal);
assert.deepEqual(journalSummary, { added: 1, updated: 0, deleted: 0, kept: 2 });
assert.equal(mergedJournal.entries.journal_newer_here.note, "Cihaz günlüğü");
assert.equal(mergedJournal.entries.journal_added.episodeEnd, 4);
assert.equal(mergedJournal.entries.journal_stays_deleted, undefined);

const { store: mergedCollections, summary: collectionSummary } = mergePersonalCollectionStores(currentCollections, parseRotaArchive(raw).collections);
assert.deepEqual(collectionSummary, { added: 1, updated: 0, deleted: 0, kept: 2 });
assert.equal(mergedCollections.collections.collection_newer_here.name, "Cihaz");
assert.equal(mergedCollections.collections.collection_added.color, "sky");
assert.equal(mergedCollections.collections.collection_stays_deleted, undefined);

for (const invalid of [
  "not-json",
  JSON.stringify({ ...document, format: "başka-format" }),
  JSON.stringify({ ...document, version: 99 }),
  JSON.stringify({ ...document, entries: [...document.entries, document.entries[0]] }),
  JSON.stringify({ ...document, entries: [{ ...document.entries[0], score: 11 }] }),
  JSON.stringify({ ...document, entries: [{ ...document.entries[0], updatedAt: "dün" }] }),
  JSON.stringify({ ...document, entries: [{ ...document.entries[0], updatedAt: "2027-08-13T00:00:00.000Z" }] }),
  JSON.stringify({ ...document, journalEntries: [{ ...document.journalEntries[0], episodeStart: 8, episodeEnd: 7 }] }),
  JSON.stringify({ ...document, journalEntries: [...document.journalEntries, document.journalEntries[0]] }),
  JSON.stringify({ ...document, collections: [...document.collections, document.collections[0]] }),
  JSON.stringify({ ...document, collections: [{ ...document.collections[0], color: "neon" }] }),
  JSON.stringify({ ...document, collections: [{ ...document.collections[0], animeIds: ["1", "1"] }] }),
]) {
  assert.throws(() => parseRotaBackup(invalid), RotaBackupError);
}

const catalogue: CatalogueAnime[] = [{
  id: "added", slug: "added", title: "=Kötü, Başlık", type: "TV", episodes: 12,
  status: "FINISHED", season: { season: "SPRING", year: 2024 }, durationSeconds: 1440,
  score: null, synonyms: [], studios: [], tags: [], sources: [],
}];
const csv = createPersonalListCsv({ version: 2, entries: { added: { ...backupStore.entries.added, note: "Satır 1\nSatır \"2\"" } }, tombstones: {} }, catalogue);
assert.ok(csv.startsWith("\uFEFF"), "Türkçe CSV Excel uyumu için BOM içermeli.");
assert.ok(csv.includes("\"'=Kötü, Başlık\""), "Formül enjeksiyonu etkisizleştirilmeli.");
assert.ok(csv.includes("\"Satır 1\nSatır \"\"2\"\"\""), "Virgül, satır sonu ve tırnaklar RFC 4180 biçiminde kaçırılmalı.");
assert.equal(csv.includes("stays_deleted"), false, "Okunabilir CSV iç tombstone kayıtlarını göstermemeli.");

const externalCatalogue: CatalogueAnime[] = [
  { ...catalogue[0], id: "cowboy", title: "Cowboy Bebop", malId: "1", anilistId: "1" },
  { ...catalogue[0], id: "monster", title: "Monster", malId: "19", anilistId: "19" },
  { ...catalogue[0], id: "ambiguous-a", title: "Belirsiz A", malId: "42", anilistId: "42" },
  { ...catalogue[0], id: "ambiguous-b", title: "Belirsiz B", malId: "42", anilistId: "42" },
];
const externalCurrent: PersonalListStore = {
  version: 2,
  entries: {
    cowboy: { animeId: "cowboy", status: "WATCHING", progress: 8, score: 9, note: "Yerel", updatedAt: "2026-08-20T12:00:00.000Z" },
  },
  tombstones: { monster: "2026-08-21T12:00:00.000Z" },
};
const malXml = `<?xml version="1.0" encoding="UTF-8"?>
<myanimelist>
  <anime><series_animedb_id>1</series_animedb_id><series_title>Cowboy Bebop</series_title><my_watched_episodes>26</my_watched_episodes><my_score>10</my_score><my_status>Completed</my_status><my_comments>Uzay kovboyları</my_comments><my_last_updated>1787133600</my_last_updated></anime>
  <anime><series_animedb_id>19</series_animedb_id><series_title>Monster</series_title><my_watched_episodes>12</my_watched_episodes><my_score>0</my_score><my_status>On-Hold</my_status><my_comments></my_comments><my_last_updated>1787220000</my_last_updated></anime>
  <anime><series_animedb_id>999999</series_animedb_id><series_title>Eşleşmeyen</series_title><my_watched_episodes>1</my_watched_episodes><my_score>7</my_score><my_status>Watching</my_status><my_last_updated>1787392800</my_last_updated></anime>
  <anime><series_animedb_id>42</series_animedb_id><series_title>Belirsiz</series_title><my_watched_episodes>1</my_watched_episodes><my_score>7</my_score><my_status>Watching</my_status><my_last_updated>1787392800</my_last_updated></anime>
</myanimelist>`;
const malPreview = createExternalListPreview("MAL", malXml, externalCatalogue, externalCurrent);
assert.equal(malPreview.sourceCount, 4);
assert.equal(malPreview.matchedCount, 2);
assert.deepEqual(malPreview.unmatched, [{ externalId: "999999", title: "Eşleşmeyen" }]);
assert.deepEqual(malPreview.ambiguous, [{ externalId: "42", title: "Belirsiz" }], "Çakışan dış kimlik sessizce ilk animeye bağlanmamalı.");
assert.deepEqual(malPreview.summary, { added: 0, updated: 0, deleted: 0, kept: 2 });
assert.equal(malPreview.incoming.entries.cowboy.status, "COMPLETED");
assert.equal(malPreview.incoming.entries.monster.status, "WATCHING");
assert.equal(malPreview.merged.entries.cowboy.note, "Yerel", "Yeni yerel kayıt eski MAL verisiyle ezilmemeli.");
assert.equal(malPreview.merged.entries.monster, undefined, "Yeni tombstone MAL kaydını diriltmemeli.");

const anilistJson = JSON.stringify({
  user: { display_name: "test" },
  lists: [
    { series_type: 0, series_id: 1, status: 2, score: 85, progress: 26, notes: "Tamam", updated_at: "2026-08-22T12:00:00.000Z" },
    { series_type: 0, series_id: 19, status: 1, score: 0, progress: 0, notes: null, updated_at: "2026-08-22T12:00:00.000Z" },
    { series_type: 1, series_id: 30013, status: 0, score: 90, progress: 5, notes: "Manga", updated_at: "2026-08-22T12:00:00.000Z" },
  ],
});
const anilistPreview = createExternalListPreview("ANILIST", anilistJson, externalCatalogue, externalCurrent);
assert.equal(anilistPreview.sourceCount, 2, "AniList manga kayıtları içe aktarılmamalı.");
assert.deepEqual(anilistPreview.summary, { added: 0, updated: 2, deleted: 0, kept: 0 });
assert.equal(anilistPreview.incoming.entries.cowboy.score, 9, "AniList 100'lük ham puanı Rota 10'luk puanına çevrilmeli.");
assert.equal(anilistPreview.incoming.entries.monster.status, "PLANNED");
const repeatedAnilist = createExternalListPreview("ANILIST", anilistJson, externalCatalogue, anilistPreview.merged);
assert.deepEqual(repeatedAnilist.summary, { added: 0, updated: 0, deleted: 0, kept: 2 }, "Aynı AniList dosyasını yeniden aktarmak etkisiz olmalı.");

assert.throws(() => createExternalListPreview("MAL", "<bozuk>", externalCatalogue, externalCurrent), ExternalListImportError);
assert.throws(() => createExternalListPreview("ANILIST", JSON.stringify({ activity: [] }), externalCatalogue, externalCurrent), ExternalListImportError);

console.log("Rota JSON/CSV taşınabilirliği, MAL/AniList önizlemesi ve yenisi-kazanır birleşimi doğrulandı.");
