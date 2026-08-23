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

const ORBIT_ISSUER = Deno.env.get('ORBIT_ISSUER') ?? 'https://orbit.sametbasbug.dev';
const ORBIT_AUDIENCE = Deno.env.get('ORBIT_AUDIENCE') ?? 'orbit-equinox-rota';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const DURUMLAR = new Set(['WATCHING', 'COMPLETED', 'PLANNED', 'DROPPED']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function hata(status: number, mesaj: string): Response {
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
  if (!response.ok) return null;
  const value = await response.json();
  return typeof value === 'string' && value.length > 0 ? value : null;
}

async function listeyeEkle(userId: string, input: Record<string, unknown>) {
  const animeId = String(input.animeId ?? '');
  const durum = String(input.durum ?? '');
  /* Orbit girdiyi şemaya göre zaten doğruladı. Burada TEKRAR doğruluyoruz:
   * Orbit şemayı bizim yayımladığımız dosyadan okuyor ve okuduğu şey 10
   * dakikaya kadar eskimiş olabilir. Ayrıca bu ucun tek koruması Orbit'in
   * dikkatli olması değil. */
  if (animeId.length === 0 || animeId.length > 300) return { hata: 'animeId geçersiz' };
  if (!DURUMLAR.has(durum)) return { hata: 'durum geçersiz' };

  const mevcut = await db(
    `personal_list_entries?user_id=eq.${userId}&anime_id=eq.${encodeURIComponent(animeId)}&select=anime_id`,
  );
  const yeniKayit = mevcut.ok ? ((await mevcut.json()) as unknown[]).length === 0 : true;

  const satir: Record<string, unknown> = {
    user_id: userId,
    anime_id: animeId,
    status: durum,
    /* `client_updated_at` şimdi: Rota'nın eşitlemesi "daha yeni olan kazanır"
     * diye çalışıyor ve bu gerçekten şu an yapılan bir değişiklik. Eski bir
     * tarih yazmak, ajanın yazdığı satırın bir sonraki tarayıcı eşitlemesinde
     * sessizce geri alınması olurdu. */
    client_updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  if (typeof input.ilerleme === 'number') satir.progress = input.ilerleme;
  if (typeof input.puan === 'number') satir.score = input.puan;
  if (typeof input.not === 'string') satir.note = input.not;

  const response = await db('personal_list_entries?on_conflict=user_id,anime_id', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(satir),
  });
  if (!response.ok) return { hata: `liste yazılamadı (${response.status})` };

  return { sonuc: { animeId, durum, yeniKayit } };
}

async function listeyiOku(userId: string, input: Record<string, unknown>) {
  const limit = typeof input.limit === 'number' ? Math.min(Math.max(input.limit, 1), 200) : 50;
  const durumFiltre = typeof input.durum === 'string' && DURUMLAR.has(input.durum)
    ? `&status=eq.${input.durum}`
    : '';
  /* Silinmiş kayıtlar dışarıda: Rota tombstone tutuyor ve ajana "listende var"
   * demek, insanın sildiği şeyi geri getirmesine yol açardı. */
  const response = await db(
    `personal_list_entries?user_id=eq.${userId}&deleted_at=is.null${durumFiltre}`
    + `&select=anime_id,status,progress,score&order=client_updated_at.desc&limit=${limit}`,
  );
  if (!response.ok) return { hata: `liste okunamadı (${response.status})` };
  const kayitlar = await response.json() as Array<Record<string, unknown>>;
  return {
    sonuc: {
      kayitlar: kayitlar.map((row) => ({
        animeId: row.anime_id,
        durum: row.status,
        ilerleme: row.progress,
        puan: row.score,
      })),
      toplam: kayitlar.length,
    },
  };
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

  const inputDigest = await digest(JSON.stringify({ operationId, input }));

  /* Tekrar mı? Aynı anahtar + aynı gövde ise ilk çalışmanın cevabı dönüyor. */
  const gecmis = await db(
    `orbit_action_log?user_id=eq.${userId}&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}`
    + '&select=input_digest,output',
  );
  if (gecmis.ok) {
    const satirlar = await gecmis.json() as Array<{ input_digest: string; output: unknown }>;
    if (satirlar.length > 0) {
      /* Aynı anahtar FARKLI gövdeyle geldi: bu bir tekrar değil, çakışma.
       * Sessizce ilk cevabı döndürmek, ajanın yaptığını sandığı işin hiç
       * yapılmaması olurdu. */
      if (satirlar[0].input_digest !== inputDigest) {
        return hata(409, 'aynı Idempotency-Key farklı bir istekle kullanıldı');
      }
      return json({ status: 'replayed', output: satirlar[0].output });
    }
  }

  type IslemSonucu = { hata: string } | { sonuc: Record<string, unknown> };
  const sonuc: IslemSonucu = operationId === 'rota.listeyeEkle'
    ? await listeyeEkle(userId, input)
    : operationId === 'rota.listeyiOku'
      ? await listeyiOku(userId, input)
      : { hata: `bilinmeyen işlem: ${operationId}` };

  if ('hata' in sonuc) return hata(operationId.startsWith('rota.') ? 400 : 404, sonuc.hata);

  await db('orbit_action_log', {
    method: 'POST',
    headers: { prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({
      user_id: userId,
      idempotency_key: idempotencyKey,
      operation_id: operationId,
      input_digest: inputDigest,
      output: sonuc.sonuc,
    }),
  });

  return json({ status: 'applied', output: sonuc.sonuc });
});
