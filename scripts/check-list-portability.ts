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

const raw = serializeRotaBackup(backupStore, "2026-08-13T12:00:00.000Z", backupJournal);
const document = JSON.parse(raw);
assert.equal(document.format, ROTA_BACKUP_FORMAT);
assert.equal(document.version, ROTA_BACKUP_VERSION);
assert.deepEqual(parseRotaBackup(raw), backupStore);
assert.deepEqual(parseRotaArchive(raw).journal, backupJournal);

const legacyDocument = { ...document, version: 1 };
delete legacyDocument.journalEntries;
delete legacyDocument.journalTombstones;
assert.deepEqual(parseRotaArchive(JSON.stringify(legacyDocument)).journal, { version: 1, entries: {}, tombstones: {} }, "Eski v1 yedekleri günlük olmadan okunmalı.");

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

console.log("Rota JSON/CSV taşınabilirliği ve yenisi-kazanır birleşimi doğrulandı.");
