/* Orbit eylem belgesinin doğrulamasını GERÇEK kriptoyla sınar.
 *
 * Anahtar burada üretiliyor, belge burada imzalanıyor, doğrulama gerçek
 * WebCrypto ile yapılıyor. Vakaların çoğu reddetme yolu: bu kod Orbit'in
 * imzasına güvenip insanın listesine yazıyor, yani imza doğrulaması güvenlik
 * sınırının kendisi. Bozulmuş bir imzada test düşmeli, yoksa bu katman
 * güvenlik değil dekordur.
 */
import { verifyOrbitActionToken } from './jwt.ts';

const ISSUER = 'https://orbit.example.test';
const AUDIENCE = 'orbit-equinox-rota';

const b64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const enc = (value: unknown) => b64(new TextEncoder().encode(JSON.stringify(value)));

async function makeKey(kid: string) {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'],
  );
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  return { kid, privateKey: pair.privateKey, jwk: { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, kid, alg: 'ES256' } };
}

const key = await makeKey('k1');
const otherKey = await makeKey('k2');
let published = [key.jwk];

const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: string | URL | Request) => {
  const target = String(url);
  if (target.endsWith('/.well-known/openid-configuration')) {
    return new Response(JSON.stringify({ jwks_uri: `${ISSUER}/jwks` }), { status: 200 });
  }
  if (target.endsWith('/jwks')) {
    return new Response(JSON.stringify({ keys: published }), { status: 200 });
  }
  return new Response('yok', { status: 404 });
}) as typeof fetch;

async function mint(signingKey: typeof key, over: Record<string, unknown> = {}, header: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  const h = enc({ alg: 'ES256', typ: 'JWT', kid: signingKey.kid, ...header });
  const p = enc({
    iss: ISSUER, aud: AUDIENCE, sub: 'pairwise-abc',
    act: { sub: 'agent:a1', handle: 'selene' },
    scope: 'site.actions', operation: 'rota.listeyeEkle',
    jti: 'j1', iat: now, exp: now + 60, ...over,
  });
  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, signingKey.privateKey, new TextEncoder().encode(`${h}.${p}`),
  ));
  return `${h}.${p}.${b64(sig)}`;
}

const results: Array<{ ok: boolean; label: string }> = [];
function check(label: string, actual: string, expected: string) {
  const ok = actual === expected;
  results.push({ ok, label });
  console.log(`${ok ? '  ok  ' : 'FAIL  '}${label.padEnd(46)} ${actual.padEnd(42)} beklenen: ${expected}`);
}
const outcome = (r: Awaited<ReturnType<typeof verifyOrbitActionToken>>) =>
  r.ok ? `ok sub=${r.claims.sub} op=${r.claims.operation}` : `${r.status} ${r.error}`;

console.log('── geçerli belge ──');
check('doğru imza kabul ediliyor',
  outcome(await verifyOrbitActionToken(await mint(key), ISSUER, AUDIENCE)),
  'ok sub=pairwise-abc op=rota.listeyeEkle');

console.log('\n── imza ──');
{
  const token = await mint(key);
  const [h, p, s] = token.split('.');
  /* İmza BAYT düzeyinde bozuluyor. Son karakteri değiştirmek kararsız bir test
     yapar: ECDSA P-256 imzası 64 bayt ve son base64 grubunun bitlerinin bir
     kısmı dolgu — o aralıkta bir değişiklik hiçbir şeyi değiştirmez. */
  const bytes = Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/') + '=='.slice(0, (4 - s.length % 4) % 4)), (c) => c.charCodeAt(0));
  bytes[0] ^= 0x01;
  check('bozulmuş imza reddediliyor',
    outcome(await verifyOrbitActionToken(`${h}.${p}.${b64(bytes)}`, ISSUER, AUDIENCE)),
    '401 imza doğrulanmadı');
}
{
  const token = await mint(key);
  const [h, , s] = token.split('.');
  const now = Math.floor(Date.now() / 1000);
  const forged = `${h}.${enc({ iss: ISSUER, aud: AUDIENCE, sub: 'baskasi', scope: 'site.actions', operation: 'rota.listeyeEkle', iat: now, exp: now + 60 })}.${s}`;
  check('değiştirilmiş gövde reddediliyor',
    outcome(await verifyOrbitActionToken(forged, ISSUER, AUDIENCE)), '401 imza doğrulanmadı');
}
check('bilinmeyen anahtar reddediliyor',
  outcome(await verifyOrbitActionToken(await mint(otherKey), ISSUER, AUDIENCE)),
  '401 token bilinmeyen bir anahtarla imzalanmış');

console.log('\n── algoritma ──');
{
  const now = Math.floor(Date.now() / 1000);
  const h = enc({ alg: 'none', typ: 'JWT', kid: 'k1' });
  const p = enc({ iss: ISSUER, aud: AUDIENCE, sub: 'saldirgan', scope: 'site.actions', operation: 'rota.listeyeEkle', iat: now, exp: now + 60 });
  check('alg:none reddediliyor',
    outcome(await verifyOrbitActionToken(`${h}.${p}.`, ISSUER, AUDIENCE)), '401 beklenen imza ES256');
}
check('alg değiştirme reddediliyor',
  outcome(await verifyOrbitActionToken(await mint(key, {}, { alg: 'HS256' }), ISSUER, AUDIENCE)),
  '401 beklenen imza ES256');

console.log('\n── iddialar ──');
{
  const now = Math.floor(Date.now() / 1000);
  check('süresi dolmuş reddediliyor',
    outcome(await verifyOrbitActionToken(await mint(key, { exp: now - 3600 }), ISSUER, AUDIENCE)),
    '401 belge süresi dolmuş');
  check('saat kayması toleransı',
    outcome(await verifyOrbitActionToken(await mint(key, { exp: now - 30 }), ISSUER, AUDIENCE)),
    'ok sub=pairwise-abc op=rota.listeyeEkle');
}
check('başka site için verilmiş reddediliyor',
  outcome(await verifyOrbitActionToken(await mint(key, { aud: 'orbit-haber' }), ISSUER, AUDIENCE)),
  '401 belge bu site için verilmemiş');
check('başka sağlayıcı reddediliyor',
  outcome(await verifyOrbitActionToken(await mint(key, { iss: 'https://sahte.example' }), ISSUER, AUDIENCE)),
  '401 belge başka bir sağlayıcıdan');
check('kimlik belgesi eylem yerine geçemiyor',
  outcome(await verifyOrbitActionToken(await mint(key, { scope: 'openid' }), ISSUER, AUDIENCE)),
  '403 belge site eylemleri için değil');
check('işlemsiz belge reddediliyor',
  outcome(await verifyOrbitActionToken(await mint(key, { operation: '' }), ISSUER, AUDIENCE)),
  '401 belge işlem taşımıyor');

console.log('\n── anahtar değişimi ──');
{
  const rotated = await makeKey('k3');
  published = [key.jwk, rotated.jwk];
  check('yeni anahtar tanınıyor (önbellek zorla tazelendi)',
    outcome(await verifyOrbitActionToken(await mint(rotated), ISSUER, AUDIENCE)),
    'ok sub=pairwise-abc op=rota.listeyeEkle');
}

console.log('\n── sağlayıcı erişilemiyor ──');
{
  const saved = globalThis.fetch;
  globalThis.fetch = (async () => new Response('kapalı', { status: 503 })) as typeof fetch;
  const unknown = await makeKey('k9');
  check('JWKS alınamıyorsa 503 (401 yanıltıcı olurdu)',
    outcome(await verifyOrbitActionToken(await mint(unknown), ISSUER, AUDIENCE)).slice(0, 3),
    '503');
  globalThis.fetch = saved;
}

globalThis.fetch = realFetch;
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} geçti`);
if (failed.length) {
  console.error('düşenler: ' + failed.map((f) => f.label).join(', '));
  /* Hem Node hem Deno altında koşuyor. `jwt.ts` saf WebCrypto kullanıyor,
     Deno'ya özel hiçbir şey yok — bu sayede CI'a ikinci bir çalışma zamanı
     kurmadan sınanabiliyor. */
  const exit = (globalThis as { process?: { exit(code: number): void }; Deno?: { exit(code: number): void } });
  if (exit.process) exit.process.exit(1);
  else if (exit.Deno) exit.Deno.exit(1);
}
