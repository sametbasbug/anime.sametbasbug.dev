import { findCatalogueAnime, type AgentCatalogue, type AgentCatalogueAnime } from './catalogue.ts';

export type JournalRow = {
  id?: unknown;
  anime_id?: unknown;
  episode_start?: unknown;
  episode_end?: unknown;
  watched_on?: unknown;
  note?: unknown;
  client_created_at?: unknown;
  client_updated_at?: unknown;
};

export type JournalValues = {
  episodeStart: number;
  episodeEnd: number;
  watchedOn: string;
  note: string;
};

export function isJournalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateJournalValues(values: JournalValues, anime: AgentCatalogueAnime): string | null {
  if (!Number.isInteger(values.episodeStart) || !Number.isInteger(values.episodeEnd)) return 'bölüm aralığı tam sayı olmalı';
  if (values.episodeStart < 1 || values.episodeEnd < values.episodeStart || values.episodeEnd > 100_000) {
    return 'bölüm aralığı geçersiz';
  }
  if (anime.episodes > 0 && values.episodeEnd > anime.episodes) {
    return `son bölüm yapımın bölüm sayısını aşamaz (${anime.episodes})`;
  }
  if (!isJournalDate(values.watchedOn)) return 'izleme tarihi geçersiz';
  if (typeof values.note !== 'string' || values.note.length > 280) return 'günlük notu geçersiz';
  return null;
}

export function presentJournalRows(
  rows: JournalRow[],
  catalogue: AgentCatalogue,
  offset: number,
  limit: number,
) {
  const records = rows.slice(offset, offset + limit).map((row) => ({
    kayitId: row.id,
    animeId: row.anime_id,
    baslik: findCatalogueAnime(catalogue, String(row.anime_id ?? ''))?.title ?? null,
    ilkBolum: row.episode_start,
    sonBolum: row.episode_end,
    tarih: row.watched_on,
    not: typeof row.note === 'string' ? row.note : '',
    olusturulmaZamani: row.client_created_at,
    guncellenmeZamani: row.client_updated_at,
  }));
  const nextOffset = offset + records.length;
  const result: Record<string, unknown> = {
    kayitlar: records,
    toplam: rows.length,
    donen: records.length,
    offset,
    dahaVar: nextOffset < rows.length,
  };
  if (nextOffset < rows.length) result.sonrakiOffset = nextOffset;
  return result;
}
