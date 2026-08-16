import { MAX_PROGRESS } from "./personal-list";

export const WATCH_JOURNAL_STORAGE_KEY = "rota.watch-journal.v1";
export const WATCH_JOURNAL_EVENT = "rota:watch-journal-change";
export const MAX_JOURNAL_NOTE_LENGTH = 280;

export type WatchJournalEntry = {
  id: string;
  animeId: string;
  episodeStart: number;
  episodeEnd: number;
  watchedOn: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type WatchJournalStore = {
  version: 1;
  entries: Record<string, WatchJournalEntry>;
  tombstones: Record<string, string>;
};

export type NewWatchJournalEntry = Pick<WatchJournalEntry, "animeId" | "episodeStart" | "episodeEnd" | "watchedOn" | "note">;

function emptyStore(): WatchJournalStore {
  return { version: 1, entries: {}, tombstones: {} };
}

function validInstant(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

export function isJournalDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function nextVersion(...versions: Array<string | undefined>) {
  const previousTime = versions.reduce((latest, version) => {
    if (!version) return latest;
    const time = Date.parse(version);
    return Number.isNaN(time) ? latest : Math.max(latest, time);
  }, 0);
  return new Date(Math.max(Date.now(), previousTime + 1)).toISOString();
}

function validIdentifier(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

export function sanitizeWatchJournalEntry(value: unknown): WatchJournalEntry | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<WatchJournalEntry>;
  if (!validIdentifier(candidate.id, 100) || !validIdentifier(candidate.animeId, 300)) return null;
  if (!isJournalDate(candidate.watchedOn)) return null;

  const episodeStart = Number(candidate.episodeStart);
  const episodeEnd = Number(candidate.episodeEnd);
  if (!Number.isInteger(episodeStart) || !Number.isInteger(episodeEnd)) return null;
  if (episodeStart < 1 || episodeEnd < episodeStart || episodeEnd > MAX_PROGRESS) return null;

  const updatedAt = validInstant(candidate.updatedAt) ? candidate.updatedAt : new Date().toISOString();
  const createdAt = validInstant(candidate.createdAt) ? candidate.createdAt : updatedAt;
  return {
    id: candidate.id,
    animeId: candidate.animeId,
    episodeStart,
    episodeEnd,
    watchedOn: candidate.watchedOn,
    note: typeof candidate.note === "string" ? candidate.note.slice(0, MAX_JOURNAL_NOTE_LENGTH) : "",
    createdAt,
    updatedAt,
  };
}

export function todayForJournal(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function newJournalId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const random = new Uint32Array(4);
    globalThis.crypto.getRandomValues(random);
    return Array.from(random, (part) => part.toString(16).padStart(8, "0")).join("-");
  }
  return `journal-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function readWatchJournal(): WatchJournalStore {
  if (typeof window === "undefined") return emptyStore();

  try {
    const raw = window.localStorage.getItem(WATCH_JOURNAL_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<WatchJournalStore>;
    const entries: Record<string, WatchJournalEntry> = {};
    for (const value of Object.values(parsed.entries ?? {})) {
      const entry = sanitizeWatchJournalEntry(value);
      if (entry) entries[entry.id] = entry;
    }

    const tombstones: Record<string, string> = {};
    if (parsed.version === 1 && parsed.tombstones && typeof parsed.tombstones === "object") {
      for (const [id, deletedAt] of Object.entries(parsed.tombstones as Record<string, unknown>)) {
        if (validIdentifier(id, 100) && validInstant(deletedAt)) tombstones[id] = deletedAt;
      }
    }
    return { version: 1, entries, tombstones };
  } catch {
    return emptyStore();
  }
}

export function replaceWatchJournal(store: WatchJournalStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WATCH_JOURNAL_STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(WATCH_JOURNAL_EVENT));
}

export function writeWatchJournalEntry(entry: WatchJournalEntry) {
  if (typeof window === "undefined") return entry;
  const store = readWatchJournal();
  const sanitized = sanitizeWatchJournalEntry({
    ...entry,
    updatedAt: nextVersion(store.entries[entry.id]?.updatedAt, store.tombstones[entry.id]),
  });
  if (!sanitized) return entry;
  store.entries[sanitized.id] = sanitized;
  delete store.tombstones[sanitized.id];
  replaceWatchJournal(store);
  return sanitized;
}

export function createWatchJournalEntry(input: NewWatchJournalEntry) {
  const now = new Date().toISOString();
  return writeWatchJournalEntry({ ...input, id: newJournalId(), createdAt: now, updatedAt: now });
}

export function removeWatchJournalEntry(id: string) {
  if (typeof window === "undefined") return;
  const store = readWatchJournal();
  const deletedAt = nextVersion(store.entries[id]?.updatedAt, store.tombstones[id]);
  delete store.entries[id];
  store.tombstones[id] = deletedAt;
  replaceWatchJournal(store);
}

export function subscribeToWatchJournal(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === WATCH_JOURNAL_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(WATCH_JOURNAL_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(WATCH_JOURNAL_EVENT, callback);
  };
}

export function journalEpisodeLabel(entry: Pick<WatchJournalEntry, "episodeStart" | "episodeEnd">) {
  return entry.episodeStart === entry.episodeEnd
    ? `${entry.episodeStart}. bölüm`
    : `${entry.episodeStart}–${entry.episodeEnd}. bölümler`;
}
