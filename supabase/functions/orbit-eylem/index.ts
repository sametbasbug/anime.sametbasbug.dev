/// <reference lib="dom" />
/* Orbit'ten gelen ajan eylemlerini karşılar.
 *
 * Bu ucu ajan çağırmıyor, ORBIT çağırıyor. Ajanın elinde Rota'ya ait bir
 * anahtar yok ve olmamalı: ChatGPT Web gibi istemcilerde saklanacak yer yok,
 * ayrıca insan Orbit panelinden erişimi kapattığında ortada yaşamaya devam
 * eden bir anahtar kalmamalı.
 *
 * Yazılan satırlar insanın KENDİ satırları. Ayrı ajan listesi yok; ajan
 * insanın adına yazıyor ve insan aynı kaydı tarayıcıdan da düzenleyebiliyor.
 */
import { verifyOrbitActionToken } from './jwt.ts';
import {
  findCatalogueAnime,
  parseCatalogue,
  searchCatalogue,
  type AgentCatalogue,
} from './catalogue.ts';
import { prepareListMutation, presentListRows, type ListRow } from './personal-list-actions.ts';
import { rezervasyonKarari, type RezervasyonSatiri } from './idempotency.ts';
import {
  isJournalDate,
  presentJournalRows,
  validateJournalValues,
  type JournalRow,
  type JournalValues,
} from './journal-actions.ts';
import {
  MAX_COLLECTIONS,
  MAX_COLLECTION_ITEMS,
  normalizeCollectionText,
  presentCollectionRows,
  validateCollectionAnimeIds,
  validateCollectionDetails,
  type CollectionRow,
} from './collection-actions.ts';
import {
  buildGentleReminders,
  recommendAnime,
  type DiscoveryPath,
} from '../../../src/lib/personal-discovery.ts';
import type { PersonalListEntry } from '../../../src/lib/personal-list.ts';
import type { WatchJournalEntry } from '../../../src/lib/watch-journal.ts';

const ORBIT_ISSUER = Deno.env.get('ORBIT_ISSUER') ?? 'https://orbit.sametbasbug.dev';
const ORBIT_AUDIENCE = Deno.env.get('ORBIT_AUDIENCE') ?? 'orbit-equinox-rota';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CATALOGUE_URL = Deno.env.get('ROTA_CATALOGUE_URL')
  ?? 'https://anime.sametbasbug.dev/data/catalogue.json';

const DURUMLAR = new Set(['WATCHING', 'COMPLETED', 'PLANNED', 'DROPPED']);
const CATALOGUE_CACHE_MS = 5 * 60 * 1_000;
const LIST_DB_PAGE_SIZE = 1_000;
const MAX_LIST_ROWS = 100_000;
const DISCOVERY_PATHS = new Set<DiscoveryPath>([
  'FOR_YOU', 'SHORT', 'MOVIE', 'ONE_SEASON', 'CALM', 'ENERGY', 'EMOTIONAL', 'MYSTERY',
]);
/* Bilinen işlemler tek yerde. Önceden bu liste iki kez yazılıydı — biri
 * katalog gerektirenler için, biri dağıtım merdiveninde — ve bilinmeyen bir
 * işlemin durum kodu `rota.` önekine bakılarak tahmin ediliyordu: `rota.yok`
 * 400, `baska.yok` 404 dönüyordu. İkisi de aynı şey, ikisi de 404. */
const KATALOG_ISLEMLERI = new Set([
  'rota.listeyeEkle', 'rota.listeyiOku', 'rota.katalogdaAra', 'rota.gunlugeEkle',
  'rota.gunluguOku', 'rota.gunlukKaydiniDuzenle', 'rota.koleksiyonlariOku',
  'rota.koleksiyonUyeliginiDegistir', 'rota.koleksiyonuSirala', 'rota.kisiselOneriler',
]);
const ISLEMLER = new Set([
  ...KATALOG_ISLEMLERI,
  'rota.listedenSil', 'rota.gunlukKaydiniSil', 'rota.koleksiyonOlustur',
  'rota.koleksiyonuDuzenle', 'rota.koleksiyonuSil',
]);
let catalogueCache: { value: AgentCatalogue; expiresAt: number } | null = null;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function hata(status: number, mesaj: string): Response {
  /* Her reddetme loglanıyor.
   *
   * Orbit, sitenin hata GÖVDESİNİ ajana taşımıyor — bilerek, çünkü içinde ne
   * olduğunu bilmediği bir metni kendi cevabı gibi göstermek olurdu. Doğru
   * karar ama teşhisi kör bırakıyor: canlıda "site 400 döndü" görülüyor,
   * sebebi görülmüyordu. Sebebi buraya yazıyoruz. */
  console.error(`orbit-eylem reddetti: ${status} ${mesaj}`);
  return json({ error: mesaj }, status);
}

async function digest(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** Service role ile PostgREST. Kütüphane yerine fetch: tek bağımlılık az bağımlılık. */
async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

async function orbitKullanicisi(subject: string): Promise<string | null> {
  const response = await db('rpc/orbit_subject_user', {
    method: 'POST',
    body: JSON.stringify({ p_subject: subject }),
  });
  if (!response.ok) {
    console.error(`kimlik eşlemesi başarısız: ${response.status} ${(await response.text()).slice(0, 300)}`);
    return null;
  }
  const value = await response.json();
  return typeof value === 'string' && value.length > 0 ? value : null;
}

async function kataloguAl(): Promise<AgentCatalogue | null> {
  if (catalogueCache && catalogueCache.expiresAt > Date.now()) return catalogueCache.value;
  try {
    const response = await fetch(CATALOGUE_URL, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error(`katalog alınamadı: ${response.status}`);
      return null;
    }
    const catalogue = parseCatalogue(await response.json());
    if (!catalogue) {
      console.error('katalog alınamadı: geçersiz veri sözleşmesi');
      return null;
    }
    catalogueCache = { value: catalogue, expiresAt: Date.now() + CATALOGUE_CACHE_MS };
    return catalogue;
  } catch (error) {
    console.error(`katalog alınamadı: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function listeyeEkle(userId: string, input: Record<string, unknown>, catalogue: AgentCatalogue) {
  const animeId = String(input.animeId ?? '');
  const durum = String(input.durum ?? '');
  /* Orbit girdiyi şemaya göre zaten doğruladı. Burada TEKRAR doğruluyoruz:
   * Orbit şemayı bizim yayımladığımız dosyadan okuyor ve okuduğu şey 10
   * dakikaya kadar eskimiş olabilir. Ayrıca bu ucun tek koruması Orbit'in
   * dikkatli olması değil. */
  if (animeId.length === 0 || animeId.length > 300) return { hata: 'animeId geçersiz' };
  if (!DURUMLAR.has(durum)) return { hata: 'durum geçersiz' };
  const anime = findCatalogueAnime(catalogue, animeId);
  if (!anime) return { hata: 'animeId Rota kataloğunda bulunamadı' };

  const mutation = prepareListMutation(input, anime);
  if (!mutation.ok) return { hata: mutation.error };

  const mevcut = await db(
    `personal_list_entries?user_id=eq.${userId}&anime_id=eq.${encodeURIComponent(animeId)}&select=anime_id`,
  );
  const yeniKayit = mevcut.ok ? ((await mevcut.json()) as unknown[]).length === 0 : true;

  const satir: Record<string, unknown> = {
    user_id: userId,
    anime_id: animeId,
    status: mutation.values.status,
    /* `client_updated_at` şimdi: Rota'nın eşitlemesi "daha yeni olan kazanır"
     * diye çalışıyor ve bu gerçekten şu an yapılan bir değişiklik. Eski bir
     * tarih yazmak, ajanın yazdığı satırın bir sonraki tarayıcı eşitlemesinde
     * sessizce geri alınması olurdu. */
    client_updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  Object.assign(satir, mutation.values);

  const response = await db('personal_list_entries?on_conflict=user_id,anime_id', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(satir),
  });
  if (!response.ok) {
    console.error(`liste yazılamadı: ${response.status} ${(await response.text()).slice(0, 300)}`);
    return { hata: `liste yazılamadı (${response.status})` };
  }

  return { sonuc: { animeId, baslik: anime.title, durum: mutation.values.status, yeniKayit } };
}

async function listeyiOku(userId: string, input: Record<string, unknown>, catalogue: AgentCatalogue) {
  if (Object.hasOwn(input, 'limit')
    && (typeof input.limit !== 'number' || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 200)) {
    return { hata: 'limit geçersiz' };
  }
  if (Object.hasOwn(input, 'offset')
    && (typeof input.offset !== 'number' || !Number.isInteger(input.offset) || input.offset < 0 || input.offset > MAX_LIST_ROWS)) {
    return { hata: 'offset geçersiz' };
  }
  const limit = typeof input.limit === 'number' ? input.limit : 50;
  const offset = typeof input.offset === 'number' ? input.offset : 0;
  const durumFiltre = typeof input.durum === 'string' && DURUMLAR.has(input.durum)
    ? `&status=eq.${input.durum}`
    : '';
  /* Silinmiş kayıtlar dışarıda: Rota tombstone tutuyor ve ajana "listende var"
   * demek, insanın sildiği şeyi geri getirmesine yol açardı. */
  const kayitlar: ListRow[] = [];
  for (let databaseOffset = 0; databaseOffset < MAX_LIST_ROWS; databaseOffset += LIST_DB_PAGE_SIZE) {
    const response = await db(
      `personal_list_entries?user_id=eq.${userId}&deleted_at=is.null${durumFiltre}`
      + '&select=anime_id,status,progress,score,note&order=client_updated_at.desc'
      + `&limit=${LIST_DB_PAGE_SIZE}&offset=${databaseOffset}`,
    );
    if (!response.ok) {
      console.error(`liste okunamadı: ${response.status} ${(await response.text()).slice(0, 300)}`);
      return { hata: `liste okunamadı (${response.status})` };
    }
    const page = await response.json() as ListRow[];
    kayitlar.push(...page);
    if (page.length < LIST_DB_PAGE_SIZE) break;
    if (kayitlar.length >= MAX_LIST_ROWS) return { hata: 'liste güvenli okuma sınırını aşıyor' };
  }
  return { sonuc: presentListRows(kayitlar, catalogue, offset, limit) };
}

async function gunlugeEkle(userId: string, input: Record<string, unknown>, catalogue: AgentCatalogue) {
  const animeId = String(input.animeId ?? '');
  const anime = findCatalogueAnime(catalogue, animeId);
  if (!anime) return { hata: 'animeId Rota kataloğunda bulunamadı' };
  if (typeof input.tarih !== 'string') return { hata: 'izleme tarihi geçersiz' };
  if (Object.hasOwn(input, 'not') && typeof input.not !== 'string') return { hata: 'günlük notu geçersiz' };
  const values: JournalValues = {
    episodeStart: Number(input.ilkBolum),
    episodeEnd: Number(input.sonBolum),
    watchedOn: input.tarih,
    note: typeof input.not === 'string' ? input.not : '',
  };
  const validationError = validateJournalValues(values, anime);
  if (validationError) return { hata: validationError };

  const entryId = crypto.randomUUID();
  const now = new Date().toISOString();
  const response = await db('rpc/orbit_add_watch_journal_entry', {
    method: 'POST',
    body: JSON.stringify({
      p_user_id: userId,
      p_id: entryId,
      p_anime_id: animeId,
      p_episode_start: values.episodeStart,
      p_episode_end: values.episodeEnd,
      p_watched_on: values.watchedOn,
      p_note: values.note,
      p_episode_total: anime.episodes,
      p_now: now,
    }),
  });
  if (!response.ok) {
    console.error(`günlük kaydı eklenemedi: ${response.status} ${(await response.text()).slice(0, 300)}`);
    return { hata: `günlük kaydı eklenemedi (${response.status})` };
  }
  const listState = await response.json() as { ilerleme?: unknown; durum?: unknown };
  return {
    sonuc: {
      kayitId: entryId,
      animeId,
      baslik: anime.title,
      ilkBolum: values.episodeStart,
      sonBolum: values.episodeEnd,
      tarih: values.watchedOn,
      listeIlerlemesi: listState.ilerleme,
      listeDurumu: listState.durum,
    },
  };
}

async function gunluguOku(userId: string, input: Record<string, unknown>, catalogue: AgentCatalogue) {
  if (Object.hasOwn(input, 'limit')
    && (typeof input.limit !== 'number' || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 200)) {
    return { hata: 'limit geçersiz' };
  }
  if (Object.hasOwn(input, 'offset')
    && (typeof input.offset !== 'number' || !Number.isInteger(input.offset) || input.offset < 0 || input.offset > MAX_LIST_ROWS)) {
    return { hata: 'offset geçersiz' };
  }
  const animeId = typeof input.animeId === 'string' ? input.animeId : '';
  if (animeId && !findCatalogueAnime(catalogue, animeId)) return { hata: 'animeId Rota kataloğunda bulunamadı' };
  const startDate = typeof input.baslangicTarihi === 'string' ? input.baslangicTarihi : '';
  const endDate = typeof input.bitisTarihi === 'string' ? input.bitisTarihi : '';
  if (startDate && !isJournalDate(startDate)) return { hata: 'başlangıç tarihi geçersiz' };
  if (endDate && !isJournalDate(endDate)) return { hata: 'bitiş tarihi geçersiz' };
  if (startDate && endDate && startDate > endDate) return { hata: 'başlangıç tarihi bitiş tarihinden sonra olamaz' };
  const limit = typeof input.limit === 'number' ? input.limit : 50;
  const offset = typeof input.offset === 'number' ? input.offset : 0;
  const filters = `${animeId ? `&anime_id=eq.${encodeURIComponent(animeId)}` : ''}`
    + `${startDate ? `&watched_on=gte.${startDate}` : ''}`
    + `${endDate ? `&watched_on=lte.${endDate}` : ''}`;
  const rows: JournalRow[] = [];
  for (let databaseOffset = 0; databaseOffset < MAX_LIST_ROWS; databaseOffset += LIST_DB_PAGE_SIZE) {
    const response = await db(
      `watch_journal_entries?user_id=eq.${userId}&deleted_at=is.null${filters}`
      + '&select=id,anime_id,episode_start,episode_end,watched_on,note,client_created_at,client_updated_at'
      + `&order=watched_on.desc,client_updated_at.desc&limit=${LIST_DB_PAGE_SIZE}&offset=${databaseOffset}`,
    );
    if (!response.ok) {
      console.error(`günlük okunamadı: ${response.status} ${(await response.text()).slice(0, 300)}`);
      return { hata: `günlük okunamadı (${response.status})` };
    }
    const page = await response.json() as JournalRow[];
    rows.push(...page);
    if (page.length < LIST_DB_PAGE_SIZE) break;
    if (rows.length >= MAX_LIST_ROWS) return { hata: 'günlük güvenli okuma sınırını aşıyor' };
  }
  return { sonuc: presentJournalRows(rows, catalogue, offset, limit) };
}

async function gunlukKaydiniDuzenle(userId: string, input: Record<string, unknown>, catalogue: AgentCatalogue) {
  const entryId = String(input.kayitId ?? '');
  if (entryId.length === 0 || entryId.length > 100) return { hata: 'kayıt kimliği geçersiz' };
  const patchFields = ['ilkBolum', 'sonBolum', 'tarih', 'not'];
  if (!patchFields.some((field) => Object.hasOwn(input, field))) return { hata: 'değiştirilecek alan yok' };
  if (Object.hasOwn(input, 'tarih') && typeof input.tarih !== 'string') return { hata: 'izleme tarihi geçersiz' };
  if (Object.hasOwn(input, 'not') && typeof input.not !== 'string') return { hata: 'günlük notu geçersiz' };
  const existingResponse = await db(
    `watch_journal_entries?user_id=eq.${userId}&id=eq.${encodeURIComponent(entryId)}`
    + '&deleted_at=is.null&select=id,anime_id,episode_start,episode_end,watched_on,note',
  );
  if (!existingResponse.ok) return { hata: `günlük kaydı okunamadı (${existingResponse.status})` };
  const existingRows = await existingResponse.json() as JournalRow[];
  const existing = existingRows[0];
  if (!existing) return { hata: 'aktif günlük kaydı bulunamadı' };
  const animeId = String(existing.anime_id ?? '');
  const anime = findCatalogueAnime(catalogue, animeId);
  if (!anime) return { hata: 'günlük kaydının animesi Rota kataloğunda bulunamadı' };
  const values: JournalValues = {
    episodeStart: Object.hasOwn(input, 'ilkBolum') ? Number(input.ilkBolum) : Number(existing.episode_start),
    episodeEnd: Object.hasOwn(input, 'sonBolum') ? Number(input.sonBolum) : Number(existing.episode_end),
    watchedOn: Object.hasOwn(input, 'tarih') ? input.tarih as string : String(existing.watched_on ?? ''),
    note: Object.hasOwn(input, 'not') ? input.not as string : String(existing.note ?? ''),
  };
  const validationError = validateJournalValues(values, anime);
  if (validationError) return { hata: validationError };
  const response = await db(
    `watch_journal_entries?user_id=eq.${userId}&id=eq.${encodeURIComponent(entryId)}`,
    {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        episode_start: values.episodeStart,
        episode_end: values.episodeEnd,
        watched_on: values.watchedOn,
        note: values.note,
        client_updated_at: new Date().toISOString(),
      }),
    },
  );
  if (!response.ok) return { hata: `günlük kaydı güncellenemedi (${response.status})` };
  return {
    sonuc: {
      kayitId: entryId,
      animeId,
      baslik: anime.title,
      ilkBolum: values.episodeStart,
      sonBolum: values.episodeEnd,
      tarih: values.watchedOn,
      not: values.note,
      guncellendi: true,
    },
  };
}

async function gunlukKaydiniSil(userId: string, input: Record<string, unknown>) {
  const entryId = String(input.kayitId ?? '');
  if (entryId.length === 0 || entryId.length > 100) return { hata: 'kayıt kimliği geçersiz' };
  const existing = await db(
    `watch_journal_entries?user_id=eq.${userId}&id=eq.${encodeURIComponent(entryId)}`
    + '&deleted_at=is.null&select=id',
  );
  if (!existing.ok) return { hata: `günlük kaydı okunamadı (${existing.status})` };
  if (((await existing.json()) as unknown[]).length === 0) return { hata: 'aktif günlük kaydı bulunamadı' };
  const now = new Date().toISOString();
  const response = await db(
    `watch_journal_entries?user_id=eq.${userId}&id=eq.${encodeURIComponent(entryId)}`,
    {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ client_updated_at: now, deleted_at: now }),
    },
  );
  if (!response.ok) return { hata: `günlük kaydı silinemedi (${response.status})` };
  return { sonuc: { kayitId: entryId, silindi: true } };
}

async function aktifKoleksiyonuAl(userId: string, collectionId: string): Promise<CollectionRow | null> {
  const response = await db(
    `personal_collections?user_id=eq.${userId}&id=eq.${encodeURIComponent(collectionId)}`
    + '&deleted_at=is.null&select=id,name,description,color,anime_ids,client_created_at,client_updated_at',
  );
  if (!response.ok) return null;
  return ((await response.json()) as CollectionRow[])[0] ?? null;
}

function koleksiyonKimligi(input: Record<string, unknown>): string | null {
  return typeof input.koleksiyonId === 'string' && input.koleksiyonId.length > 0 && input.koleksiyonId.length <= 100
    ? input.koleksiyonId
    : null;
}

async function koleksiyonOlustur(userId: string, input: Record<string, unknown>) {
  const description = Object.hasOwn(input, 'aciklama') ? input.aciklama : '';
  const color = Object.hasOwn(input, 'renk') ? input.renk : 'lavender';
  const validationError = validateCollectionDetails(input.ad, description, color);
  if (validationError) return { hata: validationError };
  const countResponse = await db(
    `personal_collections?user_id=eq.${userId}&deleted_at=is.null&select=id&limit=${MAX_COLLECTIONS + 1}`,
  );
  if (!countResponse.ok) return { hata: `koleksiyonlar okunamadı (${countResponse.status})` };
  if (((await countResponse.json()) as unknown[]).length >= MAX_COLLECTIONS) {
    return { hata: `en fazla ${MAX_COLLECTIONS} koleksiyon oluşturulabilir` };
  }
  const now = new Date().toISOString();
  const collectionId = crypto.randomUUID();
  const response = await db('personal_collections', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: userId,
      id: collectionId,
      name: normalizeCollectionText(input.ad),
      description: normalizeCollectionText(description),
      color,
      anime_ids: [],
      client_created_at: now,
      client_updated_at: now,
      deleted_at: null,
    }),
  });
  if (!response.ok) return { hata: `koleksiyon oluşturulamadı (${response.status})` };
  return {
    sonuc: {
      koleksiyonId: collectionId,
      ad: normalizeCollectionText(input.ad),
      aciklama: normalizeCollectionText(description),
      renk: color,
      animeSayisi: 0,
    },
  };
}

async function koleksiyonlariOku(userId: string, input: Record<string, unknown>, catalogue: AgentCatalogue) {
  if (Object.hasOwn(input, 'limit')
    && (typeof input.limit !== 'number' || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > MAX_COLLECTIONS)) {
    return { hata: 'limit geçersiz' };
  }
  if (Object.hasOwn(input, 'offset')
    && (typeof input.offset !== 'number' || !Number.isInteger(input.offset) || input.offset < 0 || input.offset > MAX_COLLECTIONS)) {
    return { hata: 'offset geçersiz' };
  }
  const response = await db(
    `personal_collections?user_id=eq.${userId}&deleted_at=is.null`
    + '&select=id,name,description,color,anime_ids,client_created_at,client_updated_at'
    + `&order=client_updated_at.desc&limit=${MAX_COLLECTIONS + 1}`,
  );
  if (!response.ok) return { hata: `koleksiyonlar okunamadı (${response.status})` };
  const rows = await response.json() as CollectionRow[];
  return {
    sonuc: presentCollectionRows(
      rows,
      catalogue,
      typeof input.offset === 'number' ? input.offset : 0,
      typeof input.limit === 'number' ? input.limit : MAX_COLLECTIONS,
    ),
  };
}

async function koleksiyonuDuzenle(userId: string, input: Record<string, unknown>) {
  const collectionId = koleksiyonKimligi(input);
  if (!collectionId) return { hata: 'koleksiyon kimliği geçersiz' };
  if (!['ad', 'aciklama', 'renk'].some((field) => Object.hasOwn(input, field))) return { hata: 'değiştirilecek alan yok' };
  const existing = await aktifKoleksiyonuAl(userId, collectionId);
  if (!existing) return { hata: 'aktif koleksiyon bulunamadı' };
  const name = Object.hasOwn(input, 'ad') ? input.ad : existing.name;
  const description = Object.hasOwn(input, 'aciklama') ? input.aciklama : existing.description;
  const color = Object.hasOwn(input, 'renk') ? input.renk : existing.color;
  const validationError = validateCollectionDetails(name, description, color);
  if (validationError) return { hata: validationError };
  const response = await db(
    `personal_collections?user_id=eq.${userId}&id=eq.${encodeURIComponent(collectionId)}`,
    {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        name: normalizeCollectionText(name),
        description: normalizeCollectionText(description),
        color,
        client_updated_at: new Date().toISOString(),
      }),
    },
  );
  if (!response.ok) return { hata: `koleksiyon güncellenemedi (${response.status})` };
  return {
    sonuc: {
      koleksiyonId: collectionId,
      ad: normalizeCollectionText(name),
      aciklama: normalizeCollectionText(description),
      renk: color,
      guncellendi: true,
    },
  };
}

async function koleksiyonuSil(userId: string, input: Record<string, unknown>) {
  const collectionId = koleksiyonKimligi(input);
  if (!collectionId) return { hata: 'koleksiyon kimliği geçersiz' };
  const existing = await aktifKoleksiyonuAl(userId, collectionId);
  if (!existing) return { hata: 'aktif koleksiyon bulunamadı' };
  const now = new Date().toISOString();
  const response = await db(
    `personal_collections?user_id=eq.${userId}&id=eq.${encodeURIComponent(collectionId)}`,
    {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ client_updated_at: now, deleted_at: now }),
    },
  );
  if (!response.ok) return { hata: `koleksiyon silinemedi (${response.status})` };
  return { sonuc: { koleksiyonId: collectionId, silindi: true } };
}

async function koleksiyonUyeliginiDegistir(
  userId: string,
  input: Record<string, unknown>,
  catalogue: AgentCatalogue,
) {
  const collectionId = koleksiyonKimligi(input);
  if (!collectionId) return { hata: 'koleksiyon kimliği geçersiz' };
  if (typeof input.animeId !== 'string' || !findCatalogueAnime(catalogue, input.animeId)) {
    return { hata: 'animeId Rota kataloğunda bulunamadı' };
  }
  if (typeof input.ekle !== 'boolean') return { hata: 'ekle alanı boolean olmalı' };
  const existing = await aktifKoleksiyonuAl(userId, collectionId);
  if (!existing) return { hata: 'aktif koleksiyon bulunamadı' };
  const currentIds = Array.isArray(existing.anime_ids)
    ? existing.anime_ids.filter((id): id is string => typeof id === 'string' && id !== input.animeId)
    : [];
  if (input.ekle) {
    if (currentIds.length >= MAX_COLLECTION_ITEMS) return { hata: `koleksiyon en fazla ${MAX_COLLECTION_ITEMS} anime içerebilir` };
    currentIds.push(input.animeId);
  }
  const response = await db(
    `personal_collections?user_id=eq.${userId}&id=eq.${encodeURIComponent(collectionId)}`,
    {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ anime_ids: currentIds, client_updated_at: new Date().toISOString() }),
    },
  );
  if (!response.ok) return { hata: `koleksiyon üyeliği güncellenemedi (${response.status})` };
  return {
    sonuc: {
      koleksiyonId: collectionId,
      animeId: input.animeId,
      eklendi: input.ekle,
      animeSayisi: currentIds.length,
    },
  };
}

async function koleksiyonuSirala(userId: string, input: Record<string, unknown>, catalogue: AgentCatalogue) {
  const collectionId = koleksiyonKimligi(input);
  if (!collectionId) return { hata: 'koleksiyon kimliği geçersiz' };
  const validated = validateCollectionAnimeIds(input.animeIdleri, catalogue);
  if (!validated.ok) return { hata: validated.error };
  const existing = await aktifKoleksiyonuAl(userId, collectionId);
  if (!existing) return { hata: 'aktif koleksiyon bulunamadı' };
  const currentIds = Array.isArray(existing.anime_ids)
    ? existing.anime_ids.filter((id): id is string => typeof id === 'string')
    : [];
  if (currentIds.length !== validated.animeIds.length
    || currentIds.some((animeId) => !validated.animeIds.includes(animeId))) {
    return { hata: 'sıralama mevcut koleksiyon üyelerinin her birini tam bir kez içermeli' };
  }
  const response = await db(
    `personal_collections?user_id=eq.${userId}&id=eq.${encodeURIComponent(collectionId)}`,
    {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ anime_ids: validated.animeIds, client_updated_at: new Date().toISOString() }),
    },
  );
  if (!response.ok) return { hata: `koleksiyon sıralanamadı (${response.status})` };
  return { sonuc: { koleksiyonId: collectionId, animeIdleri: validated.animeIds, siralandi: true } };
}

async function kisiselOneriler(userId: string, input: Record<string, unknown>, catalogue: AgentCatalogue) {
  const path = Object.hasOwn(input, 'yol') ? input.yol : 'FOR_YOU';
  if (typeof path !== 'string' || !DISCOVERY_PATHS.has(path as DiscoveryPath)) return { hata: 'öneri yolu geçersiz' };
  if (Object.hasOwn(input, 'limit')
    && (typeof input.limit !== 'number' || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 30)) {
    return { hata: 'limit geçersiz' };
  }

  const listRows: Array<{
    anime_id: string;
    status: PersonalListEntry['status'];
    progress: number;
    score: number | null;
    note: string;
    client_updated_at: string;
  }> = [];
  for (let offset = 0; offset < MAX_LIST_ROWS; offset += LIST_DB_PAGE_SIZE) {
    const response = await db(
      `personal_list_entries?user_id=eq.${userId}&deleted_at=is.null`
      + '&select=anime_id,status,progress,score,note,client_updated_at'
      + `&limit=${LIST_DB_PAGE_SIZE}&offset=${offset}`,
    );
    if (!response.ok) return { hata: `öneri listesi okunamadı (${response.status})` };
    const page = await response.json() as typeof listRows;
    listRows.push(...page);
    if (page.length < LIST_DB_PAGE_SIZE) break;
    if (listRows.length >= MAX_LIST_ROWS) return { hata: 'liste güvenli okuma sınırını aşıyor' };
  }

  const journalRows: Array<{
    id: string;
    anime_id: string;
    episode_start: number;
    episode_end: number;
    watched_on: string;
    note: string;
    client_created_at: string;
    client_updated_at: string;
  }> = [];
  for (let offset = 0; offset < MAX_LIST_ROWS; offset += LIST_DB_PAGE_SIZE) {
    const response = await db(
      `watch_journal_entries?user_id=eq.${userId}&deleted_at=is.null`
      + '&select=id,anime_id,episode_start,episode_end,watched_on,note,client_created_at,client_updated_at'
      + `&limit=${LIST_DB_PAGE_SIZE}&offset=${offset}`,
    );
    if (!response.ok) return { hata: `öneri günlüğü okunamadı (${response.status})` };
    const page = await response.json() as typeof journalRows;
    journalRows.push(...page);
    if (page.length < LIST_DB_PAGE_SIZE) break;
    if (journalRows.length >= MAX_LIST_ROWS) return { hata: 'günlük güvenli okuma sınırını aşıyor' };
  }

  const entries: PersonalListEntry[] = listRows
    .filter((row) => DURUMLAR.has(row.status))
    .map((row) => ({
      animeId: row.anime_id,
      status: row.status,
      progress: row.progress,
      score: row.score,
      note: row.note,
      updatedAt: row.client_updated_at,
    }));
  const journal: WatchJournalEntry[] = journalRows.map((row) => ({
    id: row.id,
    animeId: row.anime_id,
    episodeStart: row.episode_start,
    episodeEnd: row.episode_end,
    watchedOn: row.watched_on,
    note: row.note,
    createdAt: row.client_created_at,
    updatedAt: row.client_updated_at,
  }));
  const recommendations = recommendAnime(
    catalogue.items,
    entries,
    journal,
    path as DiscoveryPath,
    typeof input.limit === 'number' ? input.limit : 18,
  ).map((item) => ({
    animeId: item.anime.id,
    baslik: item.anime.title,
    tur: item.anime.type,
    bolum: item.anime.episodes,
    katalogPuani: item.anime.score,
    kaynak: item.source,
    gerekceler: item.reasons,
  }));
  const reminders = buildGentleReminders(catalogue.items, entries, journal).map((item) => ({
    animeId: item.anime.id,
    baslik: item.anime.title,
    durum: item.entry.status,
    ilerleme: item.entry.progress,
    beklemeGunu: item.daysWaiting,
    mesaj: item.message,
  }));
  return {
    sonuc: {
      yol: path,
      oneriler: recommendations,
      toplam: recommendations.length,
      nazikHatirlatmalar: reminders,
      veriKaynagi: 'Yalnız Rota ile senkronize edilmiş kişisel liste ve izleme günlüğü kullanıldı.',
    },
  };
}

async function katalogdaAra(input: Record<string, unknown>, catalogue: AgentCatalogue) {
  const arama = typeof input.arama === 'string' ? input.arama.trim() : '';
  const limit = typeof input.limit === 'number' ? Math.min(Math.max(input.limit, 1), 20) : 10;
  if (arama.length < 2 || arama.length > 120) return { hata: 'arama 2-120 karakter olmalı' };

  const sonuclar = searchCatalogue(catalogue, arama, limit).map((anime) => ({
    animeId: anime.id,
    kitsuId: anime.kitsuId,
    malId: anime.malId ?? null,
    baslik: anime.title,
    tur: anime.type,
    bolum: anime.episodes,
    durum: anime.status,
  }));
  return { sonuc: { sonuclar, toplam: sonuclar.length } };
}

async function listedenSil(userId: string, input: Record<string, unknown>) {
  const animeId = String(input.animeId ?? '');
  if (animeId.length === 0 || animeId.length > 300) return { hata: 'animeId geçersiz' };

  const mevcut = await db(
    `personal_list_entries?user_id=eq.${userId}&anime_id=eq.${encodeURIComponent(animeId)}`
    + '&deleted_at=is.null&select=anime_id',
  );
  if (!mevcut.ok) {
    console.error(`liste kaydı okunamadı: ${mevcut.status} ${(await mevcut.text()).slice(0, 300)}`);
    return { hata: `liste kaydı okunamadı (${mevcut.status})` };
  }
  if (((await mevcut.json()) as unknown[]).length === 0) return { hata: 'aktif liste kaydı bulunamadı' };

  const now = new Date().toISOString();
  const response = await db(
    `personal_list_entries?user_id=eq.${userId}&anime_id=eq.${encodeURIComponent(animeId)}`,
    {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ client_updated_at: now, deleted_at: now }),
    },
  );
  if (!response.ok) {
    console.error(`liste kaydı silinemedi: ${response.status} ${(await response.text()).slice(0, 300)}`);
    return { hata: `liste kaydı silinemedi (${response.status})` };
  }
  return { sonuc: { animeId, silindi: true } };
}


type IslemSonucu = { hata: string } | { sonuc: Record<string, unknown> };

async function islemiCalistir(
  operationId: string,
  userId: string,
  input: Record<string, unknown>,
  catalogue: AgentCatalogue | null,
): Promise<IslemSonucu> {
  switch (operationId) {
    case 'rota.listeyeEkle': return await listeyeEkle(userId, input, catalogue!);
    case 'rota.listeyiOku': return await listeyiOku(userId, input, catalogue!);
    case 'rota.listedenSil': return await listedenSil(userId, input);
    case 'rota.katalogdaAra': return await katalogdaAra(input, catalogue!);
    case 'rota.gunlugeEkle': return await gunlugeEkle(userId, input, catalogue!);
    case 'rota.gunluguOku': return await gunluguOku(userId, input, catalogue!);
    case 'rota.gunlukKaydiniDuzenle': return await gunlukKaydiniDuzenle(userId, input, catalogue!);
    case 'rota.gunlukKaydiniSil': return await gunlukKaydiniSil(userId, input);
    case 'rota.koleksiyonOlustur': return await koleksiyonOlustur(userId, input);
    case 'rota.koleksiyonlariOku': return await koleksiyonlariOku(userId, input, catalogue!);
    case 'rota.koleksiyonuDuzenle': return await koleksiyonuDuzenle(userId, input);
    case 'rota.koleksiyonuSil': return await koleksiyonuSil(userId, input);
    case 'rota.koleksiyonUyeliginiDegistir': return await koleksiyonUyeliginiDegistir(userId, input, catalogue!);
    case 'rota.koleksiyonuSirala': return await koleksiyonuSirala(userId, input, catalogue!);
    case 'rota.kisiselOneriler': return await kisiselOneriler(userId, input, catalogue!);
    /* Buraya düşmek imkânsız: `ISLEMLER` kapıda kontrol ediliyor. Yine de
     * sessiz kalmıyoruz — kümeye eklenip buraya eklenmeyen bir işlem, aksi
     * halde tanımsız davranış olurdu. */
    default: return { hata: `bilinmeyen işlem: ${operationId}` };
  }
}

/** `orbit_action_log` satırının adresi; rezervasyonun üç adımında da aynı. */
function kayitAdresi(userId: string, idempotencyKey: string): string {
  return `orbit_action_log?user_id=eq.${userId}&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}`;
}

type Rezervasyon =
  | { durum: 'rezerve' }
  | { durum: 'tekrar'; output: unknown }
  | { durum: 'red'; status: number; mesaj: string };

/* Anahtarı ÖNCE rezerve ediyoruz, işi sonra yapıyoruz.
 *
 * Eski sıra —oku, çalış, yaz— arasında gerçek bir boşluk bırakıyordu: aynı
 * anahtarla eşzamanlı gelen iki istek de "kayıt yok" görür ve ikisi de
 * uygulardı. Yarışı burada uygulama kodu çözmüyor; birincil anahtar çakışması
 * Postgres'te çözülüyor ve `ignore-duplicates` kaybedene boş dizi döndürüyor. */
async function anahtariRezerveEt(
  userId: string,
  idempotencyKey: string,
  operationId: string,
  inputDigest: string,
  kalanDeneme = 2,
): Promise<Rezervasyon> {
  const simdi = new Date().toISOString();
  const acilis = await db('orbit_action_log?on_conflict=user_id,idempotency_key', {
    method: 'POST',
    headers: { prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({
      user_id: userId,
      idempotency_key: idempotencyKey,
      operation_id: operationId,
      input_digest: inputDigest,
      output: null,
      started_at: simdi,
    }),
  });
  if (!acilis.ok) {
    console.error(`eylem kaydı açılamadı: ${acilis.status} ${(await acilis.text()).slice(0, 300)}`);
    /* 503, çünkü sorun çağıranda değil. Tekrar korumasını kuramadan işe
     * başlamak, korumayı hiç kurmamakla aynı şey olurdu. */
    return { durum: 'red', status: 503, mesaj: 'eylem kaydı açılamadı' };
  }
  if (((await acilis.json()) as unknown[]).length > 0) return { durum: 'rezerve' };

  const mevcut = await db(`${kayitAdresi(userId, idempotencyKey)}&select=input_digest,output,started_at`);
  if (!mevcut.ok) {
    console.error(`eylem kaydı okunamadı: ${mevcut.status} ${(await mevcut.text()).slice(0, 300)}`);
    return { durum: 'red', status: 503, mesaj: 'eylem kaydı okunamadı' };
  }
  const satir = ((await mevcut.json()) as RezervasyonSatiri[])[0];
  /* Satır insert ile select arasında silindi: ilk çalışma hata verip
   * rezervasyonunu bıraktı. Bu bir tekrar değil, temiz bir yeniden deneme.
   * Deneme sayısı sınırlı: sınırsız özyineleme, patolojik bir döngüde ucu
   * kendi üstüne kapatırdı. */
  if (!satir) {
    if (kalanDeneme <= 0) return { durum: 'red', status: 503, mesaj: 'eylem kaydı rezerve edilemedi' };
    return await anahtariRezerveEt(userId, idempotencyKey, operationId, inputDigest, kalanDeneme - 1);
  }

  const karar = rezervasyonKarari(satir, inputDigest, Date.now());
  if (karar.karar !== 'devral') return karar.karar === 'tekrar'
    ? { durum: 'tekrar', output: karar.output }
    : { durum: 'red', status: karar.status, mesaj: karar.mesaj };

  /* Terk edilmiş rezervasyonu devralıyoruz. `started_at` filtresi iyimser
   * kilit: aynı anda başka biri devraldıysa bize satır dönmez. */
  const devir = await db(
    `${kayitAdresi(userId, idempotencyKey)}&output=is.null`
    + `&started_at=eq.${encodeURIComponent(satir.started_at)}`,
    {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ started_at: simdi }),
    },
  );
  if (!devir.ok) {
    console.error(`eylem kaydı devralınamadı: ${devir.status} ${(await devir.text()).slice(0, 300)}`);
    return { durum: 'red', status: 503, mesaj: 'eylem kaydı devralınamadı' };
  }
  return ((await devir.json()) as unknown[]).length > 0
    ? { durum: 'rezerve' }
    : { durum: 'red', status: 409, mesaj: 'aynı Idempotency-Key ile başlayan işlem sürüyor' };
}

/* İş yapılmadıysa anahtar YANMAMALI. Rezervasyonu tutmak, geçici bir hatadan
 * sonra aynı anahtarla gelen dürüst bir yeniden denemeyi kalıcı olarak
 * engellerdi. */
async function rezervasyonuBirak(userId: string, idempotencyKey: string): Promise<void> {
  const response = await db(`${kayitAdresi(userId, idempotencyKey)}&output=is.null`, { method: 'DELETE' });
  if (!response.ok) {
    console.error(`eylem rezervasyonu bırakılamadı: ${response.status} ${(await response.text()).slice(0, 300)}`);
  }
}

async function rezervasyonuTamamla(
  userId: string,
  idempotencyKey: string,
  output: Record<string, unknown>,
): Promise<void> {
  const response = await db(`${kayitAdresi(userId, idempotencyKey)}&output=is.null`, {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify({ output }),
  });
  if (!response.ok || ((await response.json()) as unknown[]).length === 0) {
    /* İş YAPILDI ama cevabı saklayamadık. Çağırana hata dönmek yanlış olurdu —
     * yapılmış bir işi yapılmamış göstermek en kötü yalan. Ama sessiz de
     * kalmıyoruz: bu satır, ileride "ajan aynı şeyi iki kez yaptı" diye gelen
     * bir şikâyetin tek açıklaması. */
    console.error(`eylem çıktısı saklanamadı: ${operationLogHatasi(response)} (${userId}/${idempotencyKey})`);
  }
}

function operationLogHatasi(response: Response): string {
  return response.ok ? 'rezervasyon satırı bulunamadı' : `HTTP ${response.status}`;
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return hata(405, 'yalnız POST');
  if (SUPABASE_URL.length === 0 || SERVICE_KEY.length === 0) {
    return hata(503, 'Rota ajan ucu yapılandırılmamış');
  }

  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return hata(401, 'yetkilendirme başlığı yok');

  const idempotencyKey = request.headers.get('idempotency-key') ?? '';
  if (idempotencyKey.length === 0 || idempotencyKey.length > 128) {
    return hata(400, 'Idempotency-Key gerekli');
  }

  let body: { operationId?: unknown; input?: unknown };
  try {
    body = await request.json();
  } catch {
    return hata(400, 'gövde JSON değil');
  }
  const operationId = typeof body.operationId === 'string' ? body.operationId : '';
  const input = (body.input ?? {}) as Record<string, unknown>;

  const verified = await verifyOrbitActionToken(
    authorization.slice(7).trim(),
    ORBIT_ISSUER,
    ORBIT_AUDIENCE,
  );
  if (!verified.ok) return hata(verified.status, verified.error);

  /* Belgedeki işlem gövdedekiyle aynı olmak ZORUNDA. Aksi halde "listeyi oku"
   * için alınmış bir belge, gövdesi değiştirilerek "listeye yaz"a çevrilirdi. */
  if (verified.claims.operation !== operationId) {
    return hata(403, 'belge bu işlem için verilmemiş');
  }

  const userId = await orbitKullanicisi(verified.claims.sub);
  if (!userId) {
    /* Orbit kimliği tanınmadı: insan Rota'ya hiç Orbit ile girmemiş olabilir.
     * Ajanın yazacağı bir hesap yok ve hesabı biz açmıyoruz — insan kendi
     * girmeden onun adına kayıt oluşturmak, hiç istenmemiş bir hesap açmaktır. */
    return hata(404, 'bu Orbit kimliği Rota\'da tanınmıyor');
  }

  if (!ISLEMLER.has(operationId)) return hata(404, `bilinmeyen işlem: ${operationId}`);

  const inputDigest = await digest(JSON.stringify({ operationId, input }));

  const rezervasyon = await anahtariRezerveEt(userId, idempotencyKey, operationId, inputDigest);
  if (rezervasyon.durum === 'tekrar') return json({ status: 'replayed', output: rezervasyon.output });
  if (rezervasyon.durum === 'red') return hata(rezervasyon.status, rezervasyon.mesaj);

  try {
    const catalogue = KATALOG_ISLEMLERI.has(operationId) ? await kataloguAl() : null;
    if (KATALOG_ISLEMLERI.has(operationId) && !catalogue) {
      await rezervasyonuBirak(userId, idempotencyKey);
      return hata(503, 'Rota kataloğu şu anda doğrulanamıyor');
    }

    const sonuc = await islemiCalistir(operationId, userId, input, catalogue);
    if ('hata' in sonuc) {
      await rezervasyonuBirak(userId, idempotencyKey);
      return hata(400, sonuc.hata);
    }

    await rezervasyonuTamamla(userId, idempotencyKey, sonuc.sonuc);
    return json({ status: 'applied', output: sonuc.sonuc });
  } catch (error) {
    /* Beklenmedik bir düşüşte de anahtarı bırakıyoruz; yoksa ajan aşım süresi
     * dolana kadar aynı anahtarla hiçbir şey yapamazdı. */
    await rezervasyonuBirak(userId, idempotencyKey);
    throw error;
  }
});
