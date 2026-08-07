import type { SupabaseClient } from "@supabase/supabase-js";
import {
  readPersonalList,
  replacePersonalList,
  type PersonalListEntry,
  type PersonalListStore,
  type PersonalStatus,
} from "./personal-list";

type CloudListRow = {
  anime_id: string;
  status: PersonalStatus;
  progress: number;
  score: number | null;
  note: string;
  client_updated_at: string;
  deleted_at: string | null;
};

type UploadRow = CloudListRow & { user_id: string };

export type SyncResult = {
  downloaded: number;
  uploaded: number;
};

function localVersion(store: PersonalListStore, animeId: string) {
  return store.entries[animeId]?.updatedAt ?? store.tombstones[animeId] ?? null;
}

function uploadFromLocal(store: PersonalListStore, animeId: string, userId: string): UploadRow | null {
  const entry = store.entries[animeId];
  if (entry) {
    return {
      user_id: userId,
      anime_id: animeId,
      status: entry.status,
      progress: entry.progress,
      score: entry.score,
      note: entry.note,
      client_updated_at: entry.updatedAt,
      deleted_at: null,
    };
  }

  const deletedAt = store.tombstones[animeId];
  if (!deletedAt) return null;
  return {
    user_id: userId,
    anime_id: animeId,
    status: "PLANNED",
    progress: 0,
    score: null,
    note: "",
    client_updated_at: deletedAt,
    deleted_at: deletedAt,
  };
}

function applyRemote(store: PersonalListStore, row: CloudListRow) {
  if (row.deleted_at) {
    delete store.entries[row.anime_id];
    store.tombstones[row.anime_id] = row.client_updated_at;
    return;
  }

  const entry: PersonalListEntry = {
    animeId: row.anime_id,
    status: row.status,
    progress: row.progress,
    score: row.score,
    note: row.note,
    updatedAt: row.client_updated_at,
  };
  store.entries[row.anime_id] = entry;
  delete store.tombstones[row.anime_id];
}

export async function syncPersonalList(client: SupabaseClient, userId: string): Promise<SyncResult> {
  const local = readPersonalList();
  const { data, error } = await client
    .from("personal_list_entries")
    .select("anime_id,status,progress,score,note,client_updated_at,deleted_at")
    .eq("user_id", userId);

  if (error) throw error;

  const remoteRows = (data ?? []) as CloudListRow[];
  const remoteById = new Map(remoteRows.map((row) => [row.anime_id, row]));
  const animeIds = new Set([
    ...Object.keys(local.entries),
    ...Object.keys(local.tombstones),
    ...remoteById.keys(),
  ]);
  const uploads: UploadRow[] = [];
  let downloaded = 0;

  for (const animeId of animeIds) {
    const remote = remoteById.get(animeId);
    const localUpdatedAt = localVersion(local, animeId);

    if (!remote) {
      const upload = uploadFromLocal(local, animeId, userId);
      if (upload) uploads.push(upload);
      continue;
    }

    if (!localUpdatedAt || remote.client_updated_at > localUpdatedAt) {
      applyRemote(local, remote);
      downloaded += 1;
      continue;
    }

    if (remote.client_updated_at === localUpdatedAt) continue;

    const upload = uploadFromLocal(local, animeId, userId);
    if (upload) uploads.push(upload);
  }

  if (uploads.length > 0) {
    const { error: uploadError } = await client
      .from("personal_list_entries")
      .upsert(uploads, { onConflict: "user_id,anime_id" });
    if (uploadError) throw uploadError;
  }

  if (downloaded > 0) replacePersonalList(local);
  return { downloaded, uploaded: uploads.length };
}
