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
  /** Sunucunun kısıtları nedeniyle reddettiği kayıtların anime kimlikleri. */
  rejected: string[];
};

/**
 * Tek istekte gönderilen kayıt sayısı. Büyük arşivlerde tek bir dev upsert
 * yerine parçalı gönderim, hem istek boyutunu hem de bir reddin etkilediği
 * kayıt kümesini sınırlar.
 */
const UPLOAD_CHUNK_SIZE = 200;

function localVersion(store: PersonalListStore, animeId: string) {
  return store.entries[animeId]?.updatedAt ?? store.tombstones[animeId] ?? null;
}

// Yerel kayıt `2026-08-07T11:00:00.000Z`, PostgREST ise aynı anı
// `2026-08-07T11:00:00+00:00` biçiminde döndürür. Metin karşılaştırması bu iki
// biçimi hiçbir zaman eşit görmez; sürümler anlık değere çevrilerek kıyaslanır.
function versionTime(value: string | null): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
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

/**
 * Postgres veri (22xxx) ve kısıt (23xxx) hataları tek bir satırdan kaynaklanır.
 * Ağ, JWT ve RLS hataları ise isteğin tamamını ilgilendirir; onları satır satır
 * yeniden denemek yalnızca istek sayısını artırır, bu yüzden yukarı fırlatılır.
 */
function isRowRejection(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && (code.startsWith("22") || code.startsWith("23"));
}

async function upsertRows(client: SupabaseClient, rows: UploadRow[]) {
  const { error } = await client
    .from("personal_list_entries")
    .upsert(rows, { onConflict: "user_id,anime_id" });
  return error;
}

async function uploadRows(client: SupabaseClient, rows: UploadRow[]) {
  const rejected: string[] = [];
  let uploaded = 0;

  for (let start = 0; start < rows.length; start += UPLOAD_CHUNK_SIZE) {
    const chunk = rows.slice(start, start + UPLOAD_CHUNK_SIZE);
    const chunkError = await upsertRows(client, chunk);

    if (!chunkError) {
      uploaded += chunk.length;
      continue;
    }

    if (!isRowRejection(chunkError)) throw chunkError;

    // Kısıtı çiğneyen kaydı yalıtıp geri kalanı göndermeye devam eder; tek bir
    // bozuk satır kullanıcının tüm arşivinin eşitlenmesini engellemez.
    for (const row of chunk) {
      const rowError = await upsertRows(client, [row]);
      if (!rowError) uploaded += 1;
      else if (isRowRejection(rowError)) rejected.push(row.anime_id);
      else throw rowError;
    }
  }

  return { uploaded, rejected };
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

    if (!remote) {
      const upload = uploadFromLocal(local, animeId, userId);
      if (upload) uploads.push(upload);
      continue;
    }

    const localTime = versionTime(localVersion(local, animeId));
    const remoteTime = versionTime(remote.client_updated_at);

    if (localTime === null || (remoteTime !== null && remoteTime > localTime)) {
      applyRemote(local, remote);
      downloaded += 1;
      continue;
    }

    if (remoteTime === localTime) continue;

    const upload = uploadFromLocal(local, animeId, userId);
    if (upload) uploads.push(upload);
  }

  // İndirilen kayıtlar gönderimden önce yazılır; gönderim yarıda kesilse bile
  // uzaktan alınan değişiklikler kaybolmaz.
  if (downloaded > 0) replacePersonalList(local);
  if (uploads.length === 0) return { downloaded, uploaded: 0, rejected: [] };

  const { uploaded, rejected } = await uploadRows(client, uploads);
  return { downloaded, uploaded, rejected };
}
