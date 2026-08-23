import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllUserRows } from "./cloud-paging";
import {
  readWatchJournal,
  replaceWatchJournal,
  type WatchJournalEntry,
  type WatchJournalStore,
} from "./watch-journal";

type CloudJournalRow = {
  id: string;
  anime_id: string;
  episode_start: number;
  episode_end: number;
  watched_on: string;
  note: string;
  client_created_at: string;
  client_updated_at: string;
  deleted_at: string | null;
};

type UploadJournalRow = CloudJournalRow & { user_id: string };

export type JournalSyncResult = {
  downloaded: number;
  uploaded: number;
  rejected: string[];
};

const UPLOAD_CHUNK_SIZE = 200;

function localVersion(store: WatchJournalStore, id: string) {
  return store.entries[id]?.updatedAt ?? store.tombstones[id] ?? null;
}

function versionTime(value: string | null) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function uploadFromLocal(store: WatchJournalStore, id: string, userId: string): UploadJournalRow | null {
  const entry = store.entries[id];
  if (entry) {
    return {
      user_id: userId,
      id,
      anime_id: entry.animeId,
      episode_start: entry.episodeStart,
      episode_end: entry.episodeEnd,
      watched_on: entry.watchedOn,
      note: entry.note,
      client_created_at: entry.createdAt,
      client_updated_at: entry.updatedAt,
      deleted_at: null,
    };
  }

  const deletedAt = store.tombstones[id];
  if (!deletedAt) return null;
  return {
    user_id: userId,
    id,
    anime_id: "__deleted__",
    episode_start: 1,
    episode_end: 1,
    watched_on: "1970-01-01",
    note: "",
    client_created_at: deletedAt,
    client_updated_at: deletedAt,
    deleted_at: deletedAt,
  };
}

function applyRemote(store: WatchJournalStore, row: CloudJournalRow) {
  if (row.deleted_at) {
    delete store.entries[row.id];
    store.tombstones[row.id] = row.client_updated_at;
    return;
  }
  const entry: WatchJournalEntry = {
    id: row.id,
    animeId: row.anime_id,
    episodeStart: row.episode_start,
    episodeEnd: row.episode_end,
    watchedOn: row.watched_on,
    note: row.note,
    createdAt: row.client_created_at,
    updatedAt: row.client_updated_at,
  };
  store.entries[row.id] = entry;
  delete store.tombstones[row.id];
}

function isRowRejection(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && (code.startsWith("22") || code.startsWith("23"));
}

async function upsertRows(client: SupabaseClient, rows: UploadJournalRow[]) {
  const { error } = await client.from("watch_journal_entries").upsert(rows, { onConflict: "user_id,id" });
  return error;
}

async function uploadRows(client: SupabaseClient, rows: UploadJournalRow[]) {
  const rejected: string[] = [];
  let uploaded = 0;
  for (let start = 0; start < rows.length; start += UPLOAD_CHUNK_SIZE) {
    const chunk = rows.slice(start, start + UPLOAD_CHUNK_SIZE);
    const chunkError = await upsertRows(client, chunk);
    if (!chunkError) { uploaded += chunk.length; continue; }
    if (!isRowRejection(chunkError)) throw chunkError;
    for (const row of chunk) {
      const rowError = await upsertRows(client, [row]);
      if (!rowError) uploaded += 1;
      else if (isRowRejection(rowError)) rejected.push(row.id);
      else throw rowError;
    }
  }
  return { uploaded, rejected };
}

export async function syncWatchJournal(client: SupabaseClient, userId: string): Promise<JournalSyncResult> {
  const local = readWatchJournal();
  const remoteRows = await fetchAllUserRows<CloudJournalRow>(
    client,
    "watch_journal_entries",
    "id,anime_id,episode_start,episode_end,watched_on,note,client_created_at,client_updated_at,deleted_at",
    userId,
    "id",
  );
  const remoteById = new Map(remoteRows.map((row) => [row.id, row]));
  const ids = new Set([...Object.keys(local.entries), ...Object.keys(local.tombstones), ...remoteById.keys()]);
  const uploads: UploadJournalRow[] = [];
  let downloaded = 0;

  for (const id of ids) {
    const remote = remoteById.get(id);
    if (!remote) {
      const upload = uploadFromLocal(local, id, userId);
      if (upload) uploads.push(upload);
      continue;
    }
    const localTime = versionTime(localVersion(local, id));
    const remoteTime = versionTime(remote.client_updated_at);
    if (localTime === null || (remoteTime !== null && remoteTime > localTime)) {
      applyRemote(local, remote);
      downloaded += 1;
      continue;
    }
    if (remoteTime === localTime) continue;
    const upload = uploadFromLocal(local, id, userId);
    if (upload) uploads.push(upload);
  }

  if (downloaded > 0) replaceWatchJournal(local);
  if (uploads.length === 0) return { downloaded, uploaded: 0, rejected: [] };
  const { uploaded, rejected } = await uploadRows(client, uploads);
  return { downloaded, uploaded, rejected };
}
