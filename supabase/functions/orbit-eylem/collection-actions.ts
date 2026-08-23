import { findCatalogueAnime, type AgentCatalogue } from './catalogue.ts';

export const COLLECTION_COLORS = new Set(['lavender', 'coral', 'mint', 'sun', 'sky']);
export const MAX_COLLECTIONS = 40;
export const MAX_COLLECTION_ITEMS = 200;

export type CollectionRow = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  color?: unknown;
  anime_ids?: unknown;
  client_created_at?: unknown;
  client_updated_at?: unknown;
};

export function normalizeCollectionText(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ') : '';
}

export function validateCollectionDetails(name: unknown, description: unknown, color: unknown): string | null {
  const normalizedName = normalizeCollectionText(name);
  const normalizedDescription = normalizeCollectionText(description);
  if (!normalizedName || normalizedName.length > 60) return 'koleksiyon adı geçersiz';
  if (normalizedDescription.length > 240) return 'koleksiyon açıklaması geçersiz';
  if (typeof color !== 'string' || !COLLECTION_COLORS.has(color)) return 'koleksiyon rengi geçersiz';
  return null;
}

export function validateCollectionAnimeIds(value: unknown, catalogue: AgentCatalogue) {
  if (!Array.isArray(value) || value.length > MAX_COLLECTION_ITEMS) {
    return { ok: false as const, error: `koleksiyon en fazla ${MAX_COLLECTION_ITEMS} anime içerebilir` };
  }
  const animeIds: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0 || item.length > 300) {
      return { ok: false as const, error: 'koleksiyondaki animeId geçersiz' };
    }
    if (seen.has(item)) return { ok: false as const, error: `animeId birden fazla kez kullanılmış: ${item}` };
    if (!findCatalogueAnime(catalogue, item)) return { ok: false as const, error: `animeId Rota kataloğunda bulunamadı: ${item}` };
    seen.add(item);
    animeIds.push(item);
  }
  return { ok: true as const, animeIds };
}

export function presentCollectionRows(rows: CollectionRow[], catalogue: AgentCatalogue, offset: number, limit: number) {
  const page = rows.slice(offset, offset + limit).map((row) => {
    const rawIds = Array.isArray(row.anime_ids) ? row.anime_ids.filter((id): id is string => typeof id === 'string') : [];
    const anime = rawIds.map((animeId) => ({
      animeId,
      baslik: findCatalogueAnime(catalogue, animeId)?.title ?? null,
    }));
    return {
      koleksiyonId: row.id,
      ad: row.name,
      aciklama: row.description,
      renk: row.color,
      anime,
      animeSayisi: anime.length,
      olusturulmaZamani: row.client_created_at,
      guncellenmeZamani: row.client_updated_at,
    };
  });
  const nextOffset = offset + page.length;
  const result: Record<string, unknown> = {
    koleksiyonlar: page,
    toplam: rows.length,
    donen: page.length,
    offset,
    dahaVar: nextOffset < rows.length,
  };
  if (nextOffset < rows.length) result.sonrakiOffset = nextOffset;
  return result;
}
