import type { SupabaseClient } from "@supabase/supabase-js";
import {
  readPersonalCollections,
  replacePersonalCollections,
  type CollectionColor,
  type PersonalCollection,
  type PersonalCollectionsStore,
} from "./personal-collections";

type CloudCollectionRow = {
  id: string;
  name: string;
  description: string;
  color: CollectionColor;
  anime_ids: string[];
  client_created_at: string;
  client_updated_at: string;
  deleted_at: string | null;
};

type UploadCollectionRow = CloudCollectionRow & { user_id: string };

export type CollectionSyncResult = {
  downloaded: number;
  uploaded: number;
  rejected: string[];
};

const UPLOAD_CHUNK_SIZE = 100;

function localVersion(store: PersonalCollectionsStore, id: string) {
  return store.collections[id]?.updatedAt ?? store.tombstones[id] ?? null;
}

function versionTime(value: string | null) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function uploadFromLocal(store: PersonalCollectionsStore, id: string, userId: string): UploadCollectionRow | null {
  const collection = store.collections[id];
  if (collection) {
    return {
      user_id: userId,
      id,
      name: collection.name,
      description: collection.description,
      color: collection.color,
      anime_ids: collection.animeIds,
      client_created_at: collection.createdAt,
      client_updated_at: collection.updatedAt,
      deleted_at: null,
    };
  }

  const deletedAt = store.tombstones[id];
  if (!deletedAt) return null;
  return {
    user_id: userId,
    id,
    name: "__deleted__",
    description: "",
    color: "lavender",
    anime_ids: [],
    client_created_at: deletedAt,
    client_updated_at: deletedAt,
    deleted_at: deletedAt,
  };
}

function applyRemote(store: PersonalCollectionsStore, row: CloudCollectionRow) {
  if (row.deleted_at) {
    delete store.collections[row.id];
    store.tombstones[row.id] = row.client_updated_at;
    return;
  }
  const collection: PersonalCollection = {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    animeIds: [...row.anime_ids],
    createdAt: row.client_created_at,
    updatedAt: row.client_updated_at,
  };
  store.collections[row.id] = collection;
  delete store.tombstones[row.id];
}

function isRowRejection(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && (code.startsWith("22") || code.startsWith("23"));
}

async function upsertRows(client: SupabaseClient, rows: UploadCollectionRow[]) {
  const { error } = await client.from("personal_collections").upsert(rows, { onConflict: "user_id,id" });
  return error;
}

async function uploadRows(client: SupabaseClient, rows: UploadCollectionRow[]) {
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

export async function syncPersonalCollections(client: SupabaseClient, userId: string): Promise<CollectionSyncResult> {
  const local = readPersonalCollections();
  const { data, error } = await client
    .from("personal_collections")
    .select("id,name,description,color,anime_ids,client_created_at,client_updated_at,deleted_at")
    .eq("user_id", userId);
  if (error) throw error;

  const remoteRows = (data ?? []) as CloudCollectionRow[];
  const remoteById = new Map(remoteRows.map((row) => [row.id, row]));
  const ids = new Set([...Object.keys(local.collections), ...Object.keys(local.tombstones), ...remoteById.keys()]);
  const uploads: UploadCollectionRow[] = [];
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

  if (downloaded > 0) replacePersonalCollections(local);
  if (uploads.length === 0) return { downloaded, uploaded: 0, rejected: [] };
  const { uploaded, rejected } = await uploadRows(client, uploads);
  return { downloaded, uploaded, rejected };
}
