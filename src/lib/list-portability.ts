import type { CatalogueAnime } from "./catalogue-ui";
import {
  MAX_PROGRESS,
  personalStatusLabels,
  type PersonalListEntry,
  type PersonalListStore,
  type PersonalStatus,
} from "./personal-list";
import {
  MAX_JOURNAL_NOTE_LENGTH,
  isJournalDate,
  type WatchJournalEntry,
  type WatchJournalStore,
} from "./watch-journal";

export const ROTA_BACKUP_FORMAT = "equinox-rota.personal-list";
export const ROTA_BACKUP_VERSION = 2;
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
export const MAX_BACKUP_RECORDS = 20_000;
const MAX_BACKUP_CLOCK_SKEW_MS = 5 * 60 * 1000;

type BackupTombstone = {
  animeId: string;
  deletedAt: string;
};

type BackupJournalTombstone = {
  id: string;
  deletedAt: string;
};

export type RotaListBackup = {
  format: typeof ROTA_BACKUP_FORMAT;
  version: typeof ROTA_BACKUP_VERSION;
  exportedAt: string;
  entries: PersonalListEntry[];
  tombstones: BackupTombstone[];
  journalEntries: WatchJournalEntry[];
  journalTombstones: BackupJournalTombstone[];
};

export type ParsedRotaArchive = {
  list: PersonalListStore;
  journal: WatchJournalStore;
};

export type MergeSummary = {
  added: number;
  updated: number;
  deleted: number;
  kept: number;
};

const statuses = new Set<PersonalStatus>(Object.keys(personalStatusLabels) as PersonalStatus[]);

export class RotaBackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RotaBackupError";
  }
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RotaBackupError(`${label} geçerli bir nesne değil.`);
  }
  return value as Record<string, unknown>;
}

function validInstant(value: unknown, label: string): string {
  if (typeof value !== "string" || !value || Number.isNaN(Date.parse(value))) {
    throw new RotaBackupError(`${label} geçerli bir tarih değil.`);
  }
  return value;
}

function validAnimeId(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 300) {
    throw new RotaBackupError(`${label} geçerli bir anime kimliği değil.`);
  }
  return value;
}

function validJournalId(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 100) {
    throw new RotaBackupError(`${label} geçerli bir günlük kimliği değil.`);
  }
  return value;
}

function parseEntry(value: unknown, index: number): PersonalListEntry {
  const entry = objectValue(value, `entries[${index}]`);
  const animeId = validAnimeId(entry.animeId, `entries[${index}].animeId`);
  if (typeof entry.status !== "string" || !statuses.has(entry.status as PersonalStatus)) {
    throw new RotaBackupError(`entries[${index}].status desteklenmiyor.`);
  }
  if (!Number.isInteger(entry.progress) || (entry.progress as number) < 0 || (entry.progress as number) > MAX_PROGRESS) {
    throw new RotaBackupError(`entries[${index}].progress geçerli değil.`);
  }
  if (entry.score !== null && (!Number.isInteger(entry.score) || (entry.score as number) < 1 || (entry.score as number) > 10)) {
    throw new RotaBackupError(`entries[${index}].score 1–10 arasında veya boş olmalı.`);
  }
  if (typeof entry.note !== "string" || entry.note.length > 600) {
    throw new RotaBackupError(`entries[${index}].note 600 karakteri aşamaz.`);
  }

  return {
    animeId,
    status: entry.status as PersonalStatus,
    progress: entry.progress as number,
    score: entry.score as number | null,
    note: entry.note,
    updatedAt: validInstant(entry.updatedAt, `entries[${index}].updatedAt`),
  };
}

function parseTombstone(value: unknown, index: number): BackupTombstone {
  const tombstone = objectValue(value, `tombstones[${index}]`);
  return {
    animeId: validAnimeId(tombstone.animeId, `tombstones[${index}].animeId`),
    deletedAt: validInstant(tombstone.deletedAt, `tombstones[${index}].deletedAt`),
  };
}

function parseJournalEntry(value: unknown, index: number): WatchJournalEntry {
  const entry = objectValue(value, `journalEntries[${index}]`);
  const id = validJournalId(entry.id, `journalEntries[${index}].id`);
  const animeId = validAnimeId(entry.animeId, `journalEntries[${index}].animeId`);
  if (!Number.isInteger(entry.episodeStart) || !Number.isInteger(entry.episodeEnd)) {
    throw new RotaBackupError(`journalEntries[${index}] bölüm aralığı geçerli değil.`);
  }
  const episodeStart = entry.episodeStart as number;
  const episodeEnd = entry.episodeEnd as number;
  if (episodeStart < 1 || episodeEnd < episodeStart || episodeEnd > MAX_PROGRESS) {
    throw new RotaBackupError(`journalEntries[${index}] bölüm aralığı geçerli değil.`);
  }
  if (!isJournalDate(entry.watchedOn)) throw new RotaBackupError(`journalEntries[${index}].watchedOn geçerli değil.`);
  if (typeof entry.note !== "string" || entry.note.length > MAX_JOURNAL_NOTE_LENGTH) {
    throw new RotaBackupError(`journalEntries[${index}].note ${MAX_JOURNAL_NOTE_LENGTH} karakteri aşamaz.`);
  }
  return {
    id,
    animeId,
    episodeStart,
    episodeEnd,
    watchedOn: entry.watchedOn,
    note: entry.note,
    createdAt: validInstant(entry.createdAt, `journalEntries[${index}].createdAt`),
    updatedAt: validInstant(entry.updatedAt, `journalEntries[${index}].updatedAt`),
  };
}

function parseJournalTombstone(value: unknown, index: number): BackupJournalTombstone {
  const tombstone = objectValue(value, `journalTombstones[${index}]`);
  return {
    id: validJournalId(tombstone.id, `journalTombstones[${index}].id`),
    deletedAt: validInstant(tombstone.deletedAt, `journalTombstones[${index}].deletedAt`),
  };
}

function sortByAnimeId<T extends { animeId: string }>(items: T[]) {
  return items.sort((a, b) => a.animeId.localeCompare(b.animeId, "en"));
}

function sortById<T extends { id: string }>(items: T[]) {
  return items.sort((a, b) => a.id.localeCompare(b.id, "en"));
}

export function createRotaBackup(store: PersonalListStore, exportedAt = new Date().toISOString(), journal: WatchJournalStore = { version: 1, entries: {}, tombstones: {} }): RotaListBackup {
  return {
    format: ROTA_BACKUP_FORMAT,
    version: ROTA_BACKUP_VERSION,
    exportedAt: validInstant(exportedAt, "exportedAt"),
    entries: sortByAnimeId(Object.values(store.entries).map((entry) => ({ ...entry }))),
    tombstones: sortByAnimeId(Object.entries(store.tombstones).map(([animeId, deletedAt]) => ({ animeId, deletedAt }))),
    journalEntries: sortById(Object.values(journal.entries).map((entry) => ({ ...entry }))),
    journalTombstones: sortById(Object.entries(journal.tombstones).map(([id, deletedAt]) => ({ id, deletedAt }))),
  };
}

export function serializeRotaBackup(store: PersonalListStore, exportedAt?: string, journal?: WatchJournalStore): string {
  return `${JSON.stringify(createRotaBackup(store, exportedAt, journal), null, 2)}\n`;
}

export function parseRotaArchive(raw: string): ParsedRotaArchive {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new RotaBackupError("Dosya geçerli JSON değil.");
  }

  const backup = objectValue(parsed, "Yedek");
  if (backup.format !== ROTA_BACKUP_FORMAT) throw new RotaBackupError("Bu dosya Equinox Rota yedeği değil.");
  if (backup.version !== 1 && backup.version !== ROTA_BACKUP_VERSION) throw new RotaBackupError("Bu Rota yedek sürümü henüz desteklenmiyor.");
  const exportedAt = validInstant(backup.exportedAt, "exportedAt");
  if (!Array.isArray(backup.entries) || !Array.isArray(backup.tombstones)) {
    throw new RotaBackupError("Yedekte kayıt veya silme listesi eksik.");
  }
  const journalEntries = backup.version === 1 ? [] : backup.journalEntries;
  const journalTombstones = backup.version === 1 ? [] : backup.journalTombstones;
  if (!Array.isArray(journalEntries) || !Array.isArray(journalTombstones)) {
    throw new RotaBackupError("Yedekte günlük kayıtları veya günlük silme geçmişi eksik.");
  }
  if (backup.entries.length + backup.tombstones.length + journalEntries.length + journalTombstones.length > MAX_BACKUP_RECORDS) {
    throw new RotaBackupError(`Yedek en fazla ${MAX_BACKUP_RECORDS.toLocaleString("tr-TR")} kayıt içerebilir.`);
  }

  const store: PersonalListStore = { version: 2, entries: {}, tombstones: {} };
  const journal: WatchJournalStore = { version: 1, entries: {}, tombstones: {} };
  const seen = new Set<string>();
  backup.entries.forEach((value, index) => {
    const entry = parseEntry(value, index);
    if (seen.has(entry.animeId)) throw new RotaBackupError(`Anime kimliği yedekte birden fazla kez geçiyor: ${entry.animeId}`);
    seen.add(entry.animeId);
    store.entries[entry.animeId] = entry;
  });
  backup.tombstones.forEach((value, index) => {
    const tombstone = parseTombstone(value, index);
    if (seen.has(tombstone.animeId)) throw new RotaBackupError(`Anime kimliği yedekte birden fazla kez geçiyor: ${tombstone.animeId}`);
    seen.add(tombstone.animeId);
    store.tombstones[tombstone.animeId] = tombstone.deletedAt;
  });
  const seenJournal = new Set<string>();
  journalEntries.forEach((value, index) => {
    const entry = parseJournalEntry(value, index);
    if (seenJournal.has(entry.id)) throw new RotaBackupError(`Günlük kimliği yedekte birden fazla kez geçiyor: ${entry.id}`);
    seenJournal.add(entry.id);
    journal.entries[entry.id] = entry;
  });
  journalTombstones.forEach((value, index) => {
    const tombstone = parseJournalTombstone(value, index);
    if (seenJournal.has(tombstone.id)) throw new RotaBackupError(`Günlük kimliği yedekte birden fazla kez geçiyor: ${tombstone.id}`);
    seenJournal.add(tombstone.id);
    journal.tombstones[tombstone.id] = tombstone.deletedAt;
  });
  const newestAllowed = Date.parse(exportedAt) + MAX_BACKUP_CLOCK_SKEW_MS;
  for (const [animeId, version] of [
    ...Object.values(store.entries).map((entry) => [entry.animeId, entry.updatedAt] as const),
    ...Object.entries(store.tombstones),
    ...Object.values(journal.entries).flatMap((entry) => [[`journal:${entry.id}:created`, entry.createdAt] as const, [`journal:${entry.id}`, entry.updatedAt] as const]),
    ...Object.entries(journal.tombstones).map(([id, deletedAt]) => [`journal:${id}`, deletedAt] as const),
  ]) {
    if (Date.parse(version) > newestAllowed) {
      throw new RotaBackupError(`Kayıt zamanı yedek oluşturma zamanından ileride: ${animeId}`);
    }
  }
  return { list: store, journal };
}

/** Eski çağıranlar için yalnız kişisel liste bölümünü döndürür. */
export function parseRotaBackup(raw: string): PersonalListStore {
  return parseRotaArchive(raw).list;
}

function versionAt(store: PersonalListStore, animeId: string) {
  return store.entries[animeId]?.updatedAt ?? store.tombstones[animeId] ?? null;
}

/**
 * Rota yedeği ve gelecekteki kaynak eşleyicileri aynı birleşim kuralını kullanır:
 * aynı anime kimliğinde daha yeni değişiklik kazanır; eşit sürüm yeniden yazılmaz.
 */
export function mergePersonalListStores(current: PersonalListStore, incoming: PersonalListStore) {
  const store: PersonalListStore = structuredClone(current);
  const summary: MergeSummary = { added: 0, updated: 0, deleted: 0, kept: 0 };
  const incomingIds = new Set([...Object.keys(incoming.entries), ...Object.keys(incoming.tombstones)]);

  for (const animeId of incomingIds) {
    const incomingVersion = versionAt(incoming, animeId);
    const currentVersion = versionAt(store, animeId);
    const incomingTime = incomingVersion ? Date.parse(incomingVersion) : Number.NaN;
    const currentTime = currentVersion ? Date.parse(currentVersion) : Number.NEGATIVE_INFINITY;
    if (Number.isNaN(incomingTime) || incomingTime <= currentTime) {
      summary.kept += 1;
      continue;
    }

    const existed = currentVersion !== null;
    const entry = incoming.entries[animeId];
    if (entry) {
      store.entries[animeId] = { ...entry };
      delete store.tombstones[animeId];
      if (existed) summary.updated += 1;
      else summary.added += 1;
    } else {
      delete store.entries[animeId];
      store.tombstones[animeId] = incoming.tombstones[animeId];
      summary.deleted += 1;
    }
  }

  return { store, summary };
}

function journalVersionAt(store: WatchJournalStore, id: string) {
  return store.entries[id]?.updatedAt ?? store.tombstones[id] ?? null;
}

export function mergeWatchJournalStores(current: WatchJournalStore, incoming: WatchJournalStore) {
  const store: WatchJournalStore = structuredClone(current);
  const summary: MergeSummary = { added: 0, updated: 0, deleted: 0, kept: 0 };
  const incomingIds = new Set([...Object.keys(incoming.entries), ...Object.keys(incoming.tombstones)]);
  for (const id of incomingIds) {
    const incomingVersion = journalVersionAt(incoming, id);
    const currentVersion = journalVersionAt(store, id);
    const incomingTime = incomingVersion ? Date.parse(incomingVersion) : Number.NaN;
    const currentTime = currentVersion ? Date.parse(currentVersion) : Number.NEGATIVE_INFINITY;
    if (Number.isNaN(incomingTime) || incomingTime <= currentTime) { summary.kept += 1; continue; }
    const existed = currentVersion !== null;
    const entry = incoming.entries[id];
    if (entry) {
      store.entries[id] = { ...entry };
      delete store.tombstones[id];
      if (existed) summary.updated += 1;
      else summary.added += 1;
    } else {
      delete store.entries[id];
      store.tombstones[id] = incoming.tombstones[id];
      summary.deleted += 1;
    }
  }
  return { store, summary };
}

function spreadsheetSafe(value: string) {
  return /^[=+\-@\t\r]/u.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number | null) {
  const text = spreadsheetSafe(value === null ? "" : String(value));
  return `"${text.replaceAll('"', '""')}"`;
}

export function createPersonalListCsv(store: PersonalListStore, catalogue: CatalogueAnime[]): string {
  const byId = new Map(catalogue.map((anime) => [anime.id, anime]));
  const header = ["anime_id", "başlık", "durum", "ilerleme", "toplam_bölüm", "puan", "kişisel_not", "güncellenme_zamanı"];
  const rows = sortByAnimeId(Object.values(store.entries).map((entry) => ({ ...entry }))).map((entry) => {
    const anime = byId.get(entry.animeId);
    return [
      entry.animeId,
      anime?.title ?? "Katalogda bulunamadı",
      personalStatusLabels[entry.status],
      entry.progress,
      anime?.episodes ?? "",
      entry.score,
      entry.note,
      entry.updatedAt,
    ].map(csvCell).join(",");
  });
  return `\uFEFF${[header.map(csvCell).join(","), ...rows].join("\r\n")}\r\n`;
}
