import { findCatalogueAnime, type AgentCatalogue, type AgentCatalogueAnime } from './catalogue.ts';

export type ListRow = {
  anime_id?: unknown;
  status?: unknown;
  progress?: unknown;
  score?: unknown;
  note?: unknown;
};

type ListMutationResult =
  | { ok: false; error: string }
  | {
      ok: true;
      values: {
        status: string;
        progress?: number;
        score?: number | null;
        note?: string;
      };
    };

type PreparedListValues = Extract<ListMutationResult, { ok: true }>['values'];

export function prepareListMutation(
  input: Record<string, unknown>,
  anime: AgentCatalogueAnime,
): ListMutationResult {
  let status = String(input.durum ?? '');
  const scoreProvided = Object.hasOwn(input, 'puan');
  if (Object.hasOwn(input, 'puaniTemizle') && typeof input.puaniTemizle !== 'boolean') {
    return { ok: false, error: 'puaniTemizle geçersiz' };
  }
  const clearScore = input.puaniTemizle === true;
  if (scoreProvided && clearScore) return { ok: false, error: 'puan ve puaniTemizle birlikte kullanılamaz' };

  const values: PreparedListValues = { status };
  if (Object.hasOwn(input, 'ilerleme')) {
    const progress = input.ilerleme;
    if (typeof progress !== 'number' || !Number.isInteger(progress) || progress < 0 || progress > 100_000) {
      return { ok: false, error: 'ilerleme geçersiz' };
    }
    if (anime.episodes > 0 && progress > anime.episodes) {
      return { ok: false, error: `ilerleme bölüm sayısını aşamaz (${anime.episodes})` };
    }
    values.progress = progress;
    if (anime.episodes > 0 && progress >= anime.episodes) status = 'COMPLETED';
    else if (progress > 0 && status === 'PLANNED') status = 'WATCHING';
  } else if (status === 'COMPLETED' && anime.episodes > 0) {
    values.progress = anime.episodes;
  }

  if (scoreProvided) {
    const score = input.puan;
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 10) {
      return { ok: false, error: 'puan geçersiz' };
    }
    values.score = score;
  } else if (clearScore) {
    values.score = null;
  }

  if (Object.hasOwn(input, 'not')) {
    if (typeof input.not !== 'string' || input.not.length > 600) return { ok: false, error: 'not geçersiz' };
    values.note = input.not;
  }
  values.status = status;
  return { ok: true, values };
}

export function presentListRows(
  rows: ListRow[],
  catalogue: AgentCatalogue,
  offset: number,
  limit: number,
) {
  const validRows = rows.filter((row) => findCatalogueAnime(catalogue, String(row.anime_id ?? '')));
  const invalidRows = rows
    .filter((row) => !findCatalogueAnime(catalogue, String(row.anime_id ?? '')))
    .map((row) => ({ animeId: row.anime_id }));
  const page = validRows.slice(offset, offset + limit);
  const records = page.map((row) => ({
    animeId: row.anime_id,
    baslik: findCatalogueAnime(catalogue, String(row.anime_id ?? ''))?.title,
    durum: row.status,
    ilerleme: row.progress,
    puan: row.score,
    not: typeof row.note === 'string' ? row.note : '',
  }));
  const nextOffset = offset + records.length;
  const result: Record<string, unknown> = {
    kayitlar: records,
    toplam: validRows.length,
    donen: records.length,
    offset,
    dahaVar: nextOffset < validRows.length,
    gecersizKayitlar: invalidRows,
  };
  if (nextOffset < validRows.length) result.sonrakiOffset = nextOffset;
  return result;
}
