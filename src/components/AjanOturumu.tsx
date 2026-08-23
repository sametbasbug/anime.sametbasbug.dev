import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AJAN_AKISI_ISARETI,
  ajanKaydiniTemizle,
  getAjanSupabaseClient,
} from "../lib/supabase";

/* Ajana, insanın hesabında iş yapabileceği AYRI bir oturum verir.
 *
 * Neden ayrı oturum: Supabase'de her giriş kendi yenileme anahtarına ve kendi
 * `session_id`'sine sahip bağımsız bir oturum yaratıyor. Ajana kendi
 * oturumumuzun anahtarını verseydik onu geri almanın tek yolu "her yerden
 * çıkış" olurdu — yani insanın kendi oturumunu da düşürmek. Ayrı oturumda
 * `signOut({ scope: "others" })` ajanı atarken insanı yerinde bırakıyor.
 * Aradığımız kapatma düğmesi bu.
 *
 * Dönüş adresi bilerek `/hesap`: Supabase'in izinli dönüş listesi yol bazlı ve
 * oraya satır eklemek panel ayarı demek. Aynı adresi paylaşmanın tek riski
 * dönüşteki kodun yanlış istemci tarafından yakalanması; onu `supabase.ts`
 * içindeki akış işareti çözüyor.
 */

const ORBIT_PROVIDER = "custom:orbit";

function donusUrl() {
  return new URL("/hesap", window.location.origin).toString();
}

function isaretiKoy() {
  window.sessionStorage.setItem(AJAN_AKISI_ISARETI, "1");
}

function isaretiSil() {
  try {
    window.sessionStorage.removeItem(AJAN_AKISI_ISARETI);
  } catch {
    /* Depo yoksa silinecek işaret de yok. */
  }
}

/** `?code=` ve `?error=` parametrelerini adres çubuğundan düşürür. */
function adresiTemizle() {
  const url = new URL(window.location.href);
  let degisti = false;
  for (const ad of ["code", "error", "error_description", "state"]) {
    if (url.searchParams.has(ad)) {
      url.searchParams.delete(ad);
      degisti = true;
    }
  }
  if (degisti) window.history.replaceState({}, "", url.toString());
}

export default function AjanOturumu({ client }: { client: SupabaseClient }) {
  const [anahtar, setAnahtar] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);

  /* Orbit'ten dönüş. Bu etki yalnız ajan akışı işareti duruyorsa iş yapıyor —
   * insanın normal girişinden dönüşte hiçbir şeye karışmıyor. */
  useEffect(() => {
    if (window.sessionStorage.getItem(AJAN_AKISI_ISARETI) !== "1") return;

    const kod = new URL(window.location.href).searchParams.get("code");
    /* İşaret var ama kod yok: kullanıcı Orbit'te vazgeçmiş demektir. İşareti
     * burada silmezsek bir SONRAKİ normal giriş de kod yakalayamaz — yani
     * vazgeçmenin bedelini girişin tamamı öderdi. */
    if (!kod) {
      isaretiSil();
      adresiTemizle();
      return;
    }

    const ajan = getAjanSupabaseClient();
    if (!ajan) {
      isaretiSil();
      return;
    }

    setMesgul(true);
    void ajan.auth.exchangeCodeForSession(kod).then(({ data, error }) => {
      isaretiSil();
      adresiTemizle();
      setMesgul(false);
      if (error || !data.session) {
        setMesaj("Ajan oturumu açılamadı. Yeniden dene.");
        return;
      }
      setAnahtar(data.session.refresh_token);
      /* Anahtar artık ekranda; tarayıcıdaki kopyaya gerek yok. Bu SİLME,
       * oturumu kapatmıyor — `signOut` çağırsaydık ajana verdiğimiz anahtarı
       * daha vermeden iptal etmiş olurduk. */
      ajanKaydiniTemizle();
      setMesaj("");
    });
  }, []);

  const olustur = useCallback(async () => {
    const ajan = getAjanSupabaseClient();
    if (!ajan) return;
    setMesgul(true);
    setMesaj("");
    setAnahtar("");
    isaretiKoy();
    const { error } = await ajan.auth.signInWithOAuth({
      provider: ORBIT_PROVIDER,
      options: { redirectTo: donusUrl() },
    });
    if (error) {
      isaretiSil();
      setMesgul(false);
      setMesaj("Orbit'e gidilemedi. Bağlantını kontrol edip yeniden dene.");
    }
    /* Hatasız yolda buraya dönmüyoruz: tarayıcı Orbit'e gitmiş oluyor. */
  }, []);

  const kopyala = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(anahtar);
      setKopyalandi(true);
      window.setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      setMesaj("Kopyalanamadı. Anahtarı elle seçip kopyalayabilirsin.");
    }
  }, [anahtar]);

  const ajanlariCikar = useCallback(async () => {
    setMesgul(true);
    setMesaj("");
    const { error } = await client.auth.signOut({ scope: "others" });
    setMesgul(false);
    setAnahtar("");
    setMesaj(error
      ? "Ajan oturumları kapatılamadı. Yeniden dene."
      : "Bu tarayıcı dışındaki bütün oturumlar kapatıldı.");
  }, [client]);

  return (
    <section className="ajan-oturumu" aria-label="Ajan erişimi">
      <div>
        <p>AJAN ERİŞİMİ</p>
        <strong>Ajanın senin adına liste tutabilir</strong>
        <small>
          Ajanına ayrı bir oturum anahtarı verirsin; o anahtarla listene senin
          adına ekleme yapar. Anahtar yalnız bir kez gösterilir. Vazgeçtiğinde
          aşağıdaki düğme ajanların oturumunu kapatır, seninkini kapatmaz.
        </small>
      </div>

      {anahtar && (
        <div className="ajan-oturumu__anahtar">
          <label htmlFor="ajan-anahtari">Ajan oturum anahtarı</label>
          <textarea id="ajan-anahtari" readOnly rows={3} value={anahtar} onFocus={(e) => e.currentTarget.select()} />
          <small>
            Bu anahtarı ajanına ver ve burayı kapat. Sayfayı yenilersen bir daha
            göremezsin — yenisini oluşturman gerekir.
          </small>
          <button type="button" onClick={kopyala}>{kopyalandi ? "Kopyalandı" : "Anahtarı kopyala"}</button>
        </div>
      )}

      {mesaj && <p className="ajan-oturumu__mesaj" role="status">{mesaj}</p>}

      <div className="ajan-oturumu__actions">
        <button type="button" onClick={olustur} disabled={mesgul}>Ajan oturumu oluştur</button>
        <button type="button" onClick={ajanlariCikar} disabled={mesgul}>Ajan oturumlarını kapat</button>
      </div>
    </section>
  );
}
