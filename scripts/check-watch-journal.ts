import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { syncWatchJournal } from "../src/lib/journal-sync";
import {
  MAX_JOURNAL_NOTE_LENGTH,
  WATCH_JOURNAL_STORAGE_KEY,
  journalEpisodeLabel,
  readWatchJournal,
  removeWatchJournalEntry,
  writeWatchJournalEntry,
  type WatchJournalStore,
} from "../src/lib/watch-journal";
import { pagedSelect } from "./lib/fake-postgrest";

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

const original: WatchJournalStore = {
  version: 1,
  entries: {
    local_newer: { id: "local_newer", animeId: "anime-a", episodeStart: 4, episodeEnd: 6, watchedOn: "2026-08-16", note: "Yerel", createdAt: "2026-08-16T08:00:00.000Z", updatedAt: "2026-08-16T10:00:00.000Z" },
    same_instant: { id: "same_instant", animeId: "anime-b", episodeStart: 1, episodeEnd: 1, watchedOn: "2026-08-15", note: "Aynı", createdAt: "2026-08-15T08:00:00.000Z", updatedAt: "2026-08-16T10:00:00.000Z" },
  },
  tombstones: { local_deleted: "2026-08-16T11:00:00.000Z" },
};
localStorage.setItem(WATCH_JOURNAL_STORAGE_KEY, JSON.stringify(original));

assert.equal(readWatchJournal().entries.local_newer.episodeEnd, 6);
assert.equal(journalEpisodeLabel(readWatchJournal().entries.local_newer), "4–6. bölümler");

writeWatchJournalEntry({ ...original.entries.local_newer, note: "x".repeat(MAX_JOURNAL_NOTE_LENGTH + 50) });
assert.equal(readWatchJournal().entries.local_newer.note.length, MAX_JOURNAL_NOTE_LENGTH);
const editedAt = readWatchJournal().entries.local_newer.updatedAt;
removeWatchJournalEntry("local_newer");
assert.equal(readWatchJournal().entries.local_newer, undefined);
assert.ok(Date.parse(readWatchJournal().tombstones.local_newer) > Date.parse(editedAt));

localStorage.setItem(WATCH_JOURNAL_STORAGE_KEY, JSON.stringify(original));
const remoteRows = [
  { id: "local_newer", anime_id: "anime-a", episode_start: 1, episode_end: 3, watched_on: "2026-08-16", note: "Eski bulut", client_created_at: "2026-08-16T08:00:00+00:00", client_updated_at: "2026-08-16T09:00:00+00:00", deleted_at: null },
  { id: "same_instant", anime_id: "anime-b", episode_start: 1, episode_end: 1, watched_on: "2026-08-15", note: "Aynı", client_created_at: "2026-08-15T08:00:00+00:00", client_updated_at: "2026-08-16T10:00:00+00:00", deleted_at: null },
  { id: "remote_newer", anime_id: "anime-c", episode_start: 7, episode_end: 8, watched_on: "2026-08-17", note: "Bulut", client_created_at: "2026-08-17T08:00:00+00:00", client_updated_at: "2026-08-17T09:00:00+00:00", deleted_at: null },
  { id: "local_deleted", anime_id: "anime-d", episode_start: 2, episode_end: 2, watched_on: "2026-08-14", note: "Silinecek", client_created_at: "2026-08-14T08:00:00+00:00", client_updated_at: "2026-08-16T10:00:00+00:00", deleted_at: null },
];
type FakeRow = Record<string, unknown>;
const accepted: FakeRow[] = [];
const client = {
  from(table: string) {
    assert.equal(table, "watch_journal_entries");
    return {
      select: pagedSelect(remoteRows),
      async upsert(rows: FakeRow[]) { accepted.push(...rows); return { error: null }; },
    };
  },
};

const result = await syncWatchJournal(client as never, "user-1");
const merged = readWatchJournal();
assert.deepEqual(result, { downloaded: 1, uploaded: 2, rejected: [] });
assert.equal(merged.entries.remote_newer.episodeEnd, 8);
assert.equal(merged.entries.local_newer.note, "Yerel");
assert.equal(accepted.some((row) => row.id === "same_instant"), false);
assert.equal(accepted.find((row) => row.id === "local_deleted")?.deleted_at, "2026-08-16T11:00:00.000Z");

const migration = readFileSync(new URL("../supabase/migrations/202608170001_watch_journal.sql", import.meta.url), "utf8");
for (const rule of [
  "alter table public.watch_journal_entries enable row level security",
  'create policy "watch_journal_select_own"',
  'create policy "watch_journal_insert_own"',
  'create policy "watch_journal_update_own"',
  'create policy "watch_journal_delete_own"',
  "revoke all on public.watch_journal_entries from anon",
  "keep_newer_watch_journal_version",
]) assert.ok(migration.includes(rule), `Günlük migration'ında eksik koruma: ${rule}`);

console.log("İzleme günlüğü yerel kayıt, tombstone, senkronizasyon ve RLS korumaları doğrulandı.");
