import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Ajan akışı sırasında bırakılan işaret.
 *
 * Ajan oturumu, insanın oturumuyla AYNI dönüş adresini (`/hesap`) kullanıyor —
 * Supabase'in izinli dönüş listesi yol bazlı ve oraya yeni satır eklemek panel
 * ayarı demek. Aynı adresi paylaşmanın tek riski dönüşteki `?code=`: ana
 * istemci `detectSessionInUrl` ile onu görür görmez kapar ve insanın oturumunun
 * ÜSTÜNE yazar. O an ajan oturumu diye bir şey kalmaz, insanın oturumu da
 * sessizce değişmiş olur.
 *
 * Bu işaret o çakışmayı çözüyor: ajan akışı başlarken konuyor, ana istemci
 * kurulurken okunuyor ve kod yakalama o dönüş için kapatılıyor. İşaret
 * `sessionStorage`'da, çünkü yalnız o sekmenin o gidiş-dönüşü boyunca
 * yaşamalı. */
export const AJAN_AKISI_ISARETI = "rota:ajan-akisi";

/* Ajan oturumu ayrı bir depo anahtarında duruyor. Aynı anahtarı paylaşsalardı
 * ikinci giriş birincinin üstüne yazardı; ayrı tutmak "iki ayrı oturum"
 * fikrinin tarayıcı tarafındaki karşılığı. */
const AJAN_DEPO_ANAHTARI = "rota-ajan-auth";

function ajanAkisiDonusuMu() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(AJAN_AKISI_ISARETI) === "1";
  } catch {
    /* Depo kapalıysa (gizli mod, katı gizlilik ayarı) normal davran: insanın
     * girişi çalışmaya devam etsin, bozulan yalnız ajan akışı olsun. */
    return false;
  }
}

function ayarlar() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return url && publishableKey ? { url, publishableKey } : null;
}

let client: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  const ayar = ayarlar();
  client = ayar
    ? createClient(ayar.url, ayar.publishableKey, {
        auth: {
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: !ajanAkisiDonusuMu(),
        },
      })
    : null;

  return client;
}

let ajanClient: SupabaseClient | null | undefined;

/** Ajana verilecek oturumu üreten istemci. İnsanın oturumuna hiç dokunmaz. */
export function getAjanSupabaseClient(): SupabaseClient | null {
  if (ajanClient !== undefined) return ajanClient;

  const ayar = ayarlar();
  ajanClient = ayar
    ? createClient(ayar.url, ayar.publishableKey, {
        auth: {
          flowType: "pkce",
          /* `persistSession` açık olmak ZORUNDA: PKCE doğrulayıcısı buraya
           * yazılıyor ve dönüşte oradan okunuyor. Kapatmak akışı dönüşte
           * "code verifier bulunamadı" ile kırar. Depo anahtarı ayrı olduğu
           * için insanın oturumu etkilenmiyor; ajan kaydı da anahtar
           * gösterildikten sonra elle siliniyor. */
          persistSession: true,
          storageKey: AJAN_DEPO_ANAHTARI,
          /* Yenileme ajanın işi, tarayıcının değil. Burada açık olsaydı sayfa
           * açık kaldığı sürece token döner ve ajana verdiğimiz kopya
           * geçersizleşirdi. */
          autoRefreshToken: false,
          /* Kodu elle takas ediyoruz; otomatik yakalama iki istemcinin aynı
           * kod için yarışması demek olurdu. */
          detectSessionInUrl: false,
        },
      })
    : null;

  return ajanClient;
}

/** Ajan oturumunun tarayıcıdaki kopyasını siler. Oturumu SONLANDIRMAZ.
 *
 * Tek anahtarı silmek yetmiyor: PKCE doğrulayıcıları `<depo>-flow-<hash>-code-verifier`
 * gibi TÜRETİLMİŞ adlarla yazılıyor ve her denemede yenisi ekleniyor. Yalnız
 * `AJAN_DEPO_ANAHTARI` silinseydi bu kalıntılar depoda birikirdi — sır değiller
 * (kullanılmış bir akışın doğrulayıcısı işe yaramaz) ama çöp bırakmanın da
 * gerekçesi yok. Yerel denemede üç tane birikmiş halde görüldü. */
export function ajanKaydiniTemizle() {
  try {
    const depo = window.localStorage;
    for (const ad of Object.keys(depo)) {
      if (ad === AJAN_DEPO_ANAHTARI || ad.startsWith(`${AJAN_DEPO_ANAHTARI}-`)) {
        depo.removeItem(ad);
      }
    }
  } catch {
    /* Depo yoksa temizlenecek bir şey de yok. */
  }
  ajanClient = undefined;
}

export function isSupabaseConfigured() {
  return getSupabaseClient() !== null;
}
