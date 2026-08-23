/* Orbit'in eylem belgesini doğrular.
 *
 * Kütüphane çekmiyoruz. Sebep tercih değil: bu kod Orbit'in imzasına güvenip
 * insanın listesine YAZIYOR, yani doğrulamanın kendisi güvenlik sınırı. Uzak
 * bir bağımlılığın sürümü değiştiğinde sessizce gevşeyen bir doğrulama,
 * gevşediğini hiçbir yerde göstermez.
 *
 * Sahte bir "doğrulandı" dönüşü yok: imza bozulduğunda burası düşmeli, yoksa
 * bu katman güvenlik değil dekordur.
 */

export interface OrbitActionClaims {
  sub: string;
  operation: string;
  actorAgentId: string;
  actorHandle: string;
  tokenId: string;
}

export type OrbitVerifyResult =
  | { ok: true; claims: OrbitActionClaims }
  | { ok: false; status: number; error: string };

interface Jwk {
  kid?: string;
  kty?: string;
  crv?: string;
  x?: string;
  y?: string;
  alg?: string;
}

const decoder = new TextDecoder();

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/')
    + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/* JWKS önbelleği. Orbit anahtarını döndürdüğünde bilinmeyen bir `kid` gelir ve
 * o an önbellek ZORLA tazelenir — döndürmenin kesintiye yol açmaması için. */
let cachedKeys: { keys: Jwk[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 600_000;

async function loadKeys(issuer: string, force: boolean): Promise<Jwk[]> {
  const now = Date.now();
  if (!force && cachedKeys && now - cachedKeys.fetchedAt < JWKS_TTL_MS) return cachedKeys.keys;

  const discovery = await fetch(`${issuer}/.well-known/openid-configuration`);
  if (!discovery.ok) throw new Error('orbit_discovery_unavailable');
  const document = await discovery.json() as { jwks_uri?: string };
  if (typeof document.jwks_uri !== 'string') throw new Error('orbit_discovery_invalid');

  const jwks = await fetch(document.jwks_uri);
  if (!jwks.ok) throw new Error('orbit_jwks_unavailable');
  const parsed = await jwks.json() as { keys?: Jwk[] };
  const keys = Array.isArray(parsed.keys) ? parsed.keys : [];
  cachedKeys = { keys, fetchedAt: now };
  return keys;
}

export async function verifyOrbitActionToken(
  token: string,
  issuer: string,
  audience: string,
): Promise<OrbitVerifyResult> {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, status: 401, error: 'token biçimi geçersiz' };

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(decoder.decode(base64UrlToBytes(parts[0])));
    payload = JSON.parse(decoder.decode(base64UrlToBytes(parts[1])));
  } catch {
    return { ok: false, status: 401, error: 'token çözülemedi' };
  }

  /* `alg` kontrolü imzadan ÖNCE ve beklenen değere karşı yapılıyor. Token'ın
   * söylediği algoritmaya uymak, `alg: none` ile imzasız token kabul etmek
   * demek olurdu — JWT'nin en eski tuzağı. */
  if (header.alg !== 'ES256') return { ok: false, status: 401, error: 'beklenen imza ES256' };
  if (typeof header.kid !== 'string') return { ok: false, status: 401, error: 'token kid taşımıyor' };

  let keys: Jwk[];
  try {
    keys = await loadKeys(issuer, false);
    if (!keys.some((key) => key.kid === header.kid)) keys = await loadKeys(issuer, true);
  } catch {
    /* Sağlayıcıya ulaşılamıyorsa 503. 401 demek "token geçersiz" demek olurdu
     * ve çağıranı token'ı yenilemeye gönderirdi — oysa sorun onda değil. */
    return { ok: false, status: 503, error: 'Orbit anahtarlarına ulaşılamıyor' };
  }

  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk || jwk.kty !== 'EC' || jwk.crv !== 'P-256') {
    return { ok: false, status: 401, error: 'token bilinmeyen bir anahtarla imzalanmış' };
  }

  let verified = false;
  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, ext: true },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    verified = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      base64UrlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
  } catch {
    verified = false;
  }
  if (!verified) return { ok: false, status: 401, error: 'imza doğrulanmadı' };

  const now = Math.floor(Date.now() / 1000);
  /* 60 saniyelik saat kayması toleransı. Belgenin ömrü de 60 saniye; iki
   * makinenin saati arasındaki fark yüzünden geçerli bir belgeyi reddetmek,
   * ajanın işini sebepsiz düşürürdü. */
  if (typeof payload.exp !== 'number' || payload.exp + 60 < now) {
    return { ok: false, status: 401, error: 'belge süresi dolmuş' };
  }
  if (typeof payload.iat === 'number' && payload.iat - 60 > now) {
    return { ok: false, status: 401, error: 'belge gelecekte verilmiş' };
  }
  if (payload.iss !== issuer) return { ok: false, status: 401, error: 'belge başka bir sağlayıcıdan' };

  const aud = payload.aud;
  const audMatches = Array.isArray(aud) ? aud.includes(audience) : aud === audience;
  if (!audMatches) return { ok: false, status: 401, error: 'belge bu site için verilmemiş' };

  if (payload.scope !== 'site.actions') {
    return { ok: false, status: 403, error: 'belge site eylemleri için değil' };
  }
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    return { ok: false, status: 401, error: 'belge sub taşımıyor' };
  }
  if (typeof payload.operation !== 'string' || payload.operation.length === 0) {
    return { ok: false, status: 401, error: 'belge işlem taşımıyor' };
  }

  const act = (payload.act ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    claims: {
      sub: payload.sub,
      operation: payload.operation,
      actorAgentId: typeof act.sub === 'string' ? act.sub : 'bilinmiyor',
      actorHandle: typeof act.handle === 'string' ? act.handle : 'bilinmiyor',
      tokenId: typeof payload.jti === 'string' ? payload.jti : '',
    },
  };
}
