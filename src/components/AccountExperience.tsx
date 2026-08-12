import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { syncPersonalList, type SyncResult } from "../lib/cloud-sync";
import { readPersonalList, subscribeToPersonalList } from "../lib/personal-list";
import { getSupabaseClient } from "../lib/supabase";
import RotaCompanion from "./RotaCompanion";

type Visibility = "PRIVATE" | "UNLISTED" | "PUBLIC";
type Profile = {
  display_name: string;
  list_visibility: Visibility;
};

/* Giriş artık Orbit üzerinden.
 *
 * Eskiden burada Google'ın tek-dokunuş kutusu vardı: sayfaya Google'dan bir
 * betik iniyor, kimlik belgesini o üretiyor, biz `signInWithIdToken` ile
 * Supabase'e veriyorduk. Orbit'te o iş tarayıcının kendi yönlendirmesiyle
 * oluyor — üçüncü taraf betiği yok, `nonce` üretme/özetleme yok, düğmeyi
 * başkasının çizmesini bekleyen bir efekt yok. Bu yüzden bu bölüm kod olarak
 * da küçüldü.
 *
 * Sağlayıcı adı Supabase'de `custom:orbit` diye kayıtlı; buradaki metin o
 * kaydın adıyla birebir aynı olmak zorunda. */
const ORBIT_PROVIDER = "custom:orbit";

/* Dönüş adresi kendi kökeninden üretiliyor, sabit yazılmıyor: aynı kod
 * localhost'ta, önizlemede ve canlıda çalışsın diye. Karşılığında Supabase'in
 * izinli dönüş adresleri listesinde bu adreslerin bulunması gerekiyor —
 * listede olmayan bir adrese Supabase dönmez, sessizce site köküne atar. */
function accountReturnUrl() {
  return new URL("/hesap", window.location.origin).toString();
}

const visibilityLabels: Record<Visibility, { title: string; detail: string }> = {
  PRIVATE: { title: "Yalnızca ben", detail: "Listen yalnız giriş yaptığın cihazlarda görünür." },
  UNLISTED: { title: "Bağlantıya sahip olanlar", detail: "Paylaşım sayfası açıldığında yalnız bağlantıyı bilenler erişebilir." },
  PUBLIC: { title: "Herkese açık", detail: "Paylaşım sayfası açıldığında profilin herkese görünür olabilir." },
};

export default function AccountExperience() {
  const client = useMemo(() => getSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(client));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile>({ display_name: "", list_visibility: "PRIVATE" });
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [localCount, setLocalCount] = useState(0);
  const autoSyncedUserRef = useRef<string | null>(null);

  const refreshLocalCount = useCallback(() => {
    setLocalCount(Object.keys(readPersonalList().entries).length);
  }, []);

  const syncForUser = useCallback(async (userId: string, announceSuccess: boolean) => {
    if (!client) return;
    setBusy(true);
    if (announceSuccess) setMessage("");
    try {
      const result = await syncPersonalList(client, userId);
      setSyncResult(result);
      refreshLocalCount();
      if (result.rejected.length > 0) {
        setMessage(`Eşitleme tamamlandı; ${result.rejected.length} kayıt sunucu tarafından reddedildi ve bu cihazda korunuyor.`);
      } else if (announceSuccess) {
        setMessage("Yerel arşivin bulutla eşitlendi.");
      }
    } catch (error) {
      setMessage(`Senkronizasyon tamamlanamadı: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`);
    } finally {
      setBusy(false);
    }
  }, [client, refreshLocalCount]);

  useEffect(() => {
    refreshLocalCount();
    return subscribeToPersonalList(refreshLocalCount);
  }, [refreshLocalCount]);

  useEffect(() => {
    if (!client) return;
    let active = true;
    const loadingTimer = window.setTimeout(() => {
      if (active) setLoading(false);
    }, 4000);

    const loadProfile = async (nextSession: Session | null) => {
      if (!nextSession) return;
      const { data } = await client
        .from("profiles")
        .select("display_name,list_visibility")
        .eq("id", nextSession.user.id)
        .maybeSingle();
      if (active && data) setProfile(data as Profile);
    };

    const syncAfterSignIn = (nextSession: Session | null) => {
      if (!nextSession) {
        autoSyncedUserRef.current = null;
        return;
      }
      if (autoSyncedUserRef.current === nextSession.user.id) return;
      autoSyncedUserRef.current = nextSession.user.id;
      void syncForUser(nextSession.user.id, false);
    };

    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      window.clearTimeout(loadingTimer);
      setSession(data.session);
      setLoading(false);
      void loadProfile(data.session);
      syncAfterSignIn(data.session);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      window.setTimeout(() => {
        void loadProfile(nextSession);
        syncAfterSignIn(nextSession);
      }, 0);
    });

    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
      listener.subscription.unsubscribe();
    };
  }, [client, syncForUser]);

  const signInWithOrbit = useCallback(async () => {
    if (!client) return;
    setBusy(true);
    setMessage("");
    const { error } = await client.auth.signInWithOAuth({
      provider: ORBIT_PROVIDER,
      options: { redirectTo: accountReturnUrl() },
    });
    /* Hatasız durumda buraya dönmüyoruz: tarayıcı Orbit'e gitmiş oluyor. O
     * yüzden `busy` yalnız hata yolunda geri açılıyor — başarı yolunda düğmeyi
     * yeniden etkinleştirmek, sayfa değişirken bir an "yeniden basılabilir"
     * göstermek olurdu. */
    if (error) {
      setBusy(false);
      setMessage("Orbit ile giriş başlatılamadı. Bağlantını kontrol edip yeniden dene.");
    }
  }, [client]);

  const saveProfile = async (next: Profile) => {
    if (!client || !session) return;
    setBusy(true);
    setMessage("");
    const { error } = await client.from("profiles").upsert({
      id: session.user.id,
      display_name: next.display_name.trim(),
      list_visibility: next.list_visibility,
    });
    setBusy(false);
    if (error) {
      setMessage(`Profil kaydedilemedi: ${error.message}`);
      return;
    }
    setProfile(next);
    setMessage("Profil tercihin kaydedildi.");
  };

  const syncNow = async () => {
    if (!client || !session) return;
    await syncForUser(session.user.id, true);
  };

  /* Orbit `name` ve `preferred_username` gönderiyor; Supabase eski Google
   * kimliğinden gelen `full_name` alanını da aynı kullanıcıda tutuyor. Üçünü
   * sırayla deniyoruz ki hem Orbit'ten gelen hem devralınan ad çalışsın. */
  const metadata = session?.user.user_metadata ?? {};
  const orbitName = ["full_name", "name", "preferred_username"]
    .map((key) => (typeof metadata[key] === "string" ? (metadata[key] as string).trim() : ""))
    .find((value) => value.length > 0) ?? "";
  const displayName = profile.display_name.trim() || orbitName || "Anime yolcusu";
  const profileInitial = displayName.charAt(0).toLocaleUpperCase("tr-TR");
  const syncHasError = message.startsWith("Senkronizasyon tamamlanamadı");
  const syncIsPartial = (syncResult?.rejected.length ?? 0) > 0;
  const companionState = busy
    ? { mood: "syncing" as const, message: "Rafları buluşturuyorum…" }
    : syncHasError || syncIsPartial
      ? { mood: "error" as const, message: syncIsPartial ? "Bir kayda bakmalıyız." : "Bağlantı biraz huysuz." }
      : syncResult
        ? { mood: "celebrating" as const, message: "Rafların buluştu!" }
        : { mood: "happy" as const, message: "Rafın hazır!" };

  if (!client) {
    return (
      <div className="account-notice">
        <span>✦ YEREL MOD</span>
        <h2>Rafın bu cihazda güvende.</h2>
        <p>Hesap altyapısı hazır. Supabase projesinin URL ve publishable anahtarı tanımlanana kadar mevcut listen bu tarayıcıda güvenle çalışmaya devam eder.</p>
      </div>
    );
  }

  if (loading) return <div className="catalogue-loading"><span></span><p>Hesabın kontrol ediliyor…</p></div>;

  if (!session) {
    return (
      <div className="account-dashboard account-dashboard--guest" key="signed-out">
        <section className="account-profile-card account-profile-card--guest">
          <div className="account-card__topline"><span>ÜYELİK İSTEĞE BAĞLI</span><b aria-hidden="true">✦</b></div>
          <p className="eyebrow">ORBIT İLE GÜVENLİ GİRİŞ</p>
          <h2>Rafın, her cihazda seninle.</h2>
          <p className="account-intro">Orbit hesabınla giriş yaptığında bu cihazdaki {localCount} kayıt hesabınla birleşir. Girişi Orbit yapar; Rota parolanı görmez, istemez ve saklamaz.</p>

          <ul className="account-benefits" aria-label="Hesap özellikleri">
            <li><i>01</i><span><b>Önce cihazında</b><small>Değişikliklerin anında kaydolur.</small></span></li>
            <li><i>02</i><span><b>Sonra bulutta</b><small>İstersen diğer cihazlarına taşınır.</small></span></li>
            <li><i>03</i><span><b>Kontrol sende</b><small>Listen varsayılan olarak özeldir.</small></span></li>
          </ul>

          <button className="account-orbit" onClick={signInWithOrbit} disabled={busy}>
            <span aria-hidden="true">✦</span>
            {busy ? "Orbit'e yönlendiriliyorsun…" : "Orbit ile devam et"}
          </button>
          <p className="account-caveat">Orbit hesabın yoksa aynı ekranda açabilirsin.</p>
          {message && <p className="account-message" role="status">{message}</p>}
        </section>
        <aside className="account-shelf-card">
          <div className="account-shelf-card__art" aria-hidden="true">
            <span className="account-moon"><i></i></span>
            <span className="account-star account-star--one">✦</span>
            <span className="account-star account-star--two">✧</span>
          </div>
          <span className="account-shelf-card__label">BU CİHAZDAKİ RAFIN</span>
          <strong>{localCount.toString().padStart(2, "0")}</strong>
          <h3>anime seni bekliyor</h3>
          <p>Giriş yapmadan da kullanmaya devam edebilirsin. Kayıtların bu tarayıcıda kalır.</p>
          <a href="/listem">Rafımı aç <span>→</span></a>
        </aside>
      </div>
    );
  }

  return (
    <div className="account-dashboard account-dashboard--signed-in" key="signed-in">
      <section className="account-profile-card">
        <RotaCompanion {...companionState} className="rota-companion--account-sync" />
        <div className="account-identity">
          <div className="account-avatar">{profileInitial}<span aria-hidden="true">✦</span></div>
          <div>
            <p>ROTA CLUB · BAĞLI HESAP</p>
            <h2>{displayName}</h2>
            <small>{session.user.email}</small>
          </div>
        </div>
        <p className="account-intro">Anime rafındaki değişiklikler önce cihazında kaydolur, bağlantı olduğunda hesabınla eşitlenir.</p>
        <div className="account-mini-stats">
          <div><strong>{localCount}</strong><span>Bu cihazdaki anime</span></div>
          <div><strong>{syncResult?.rejected.length ?? 0}</strong><span>Bekleyen sorun</span></div>
          <div><strong>✓</strong><span>Local-first açık</span></div>
        </div>
        <div className="account-sync">
          <div><strong>{busy ? "Rafın güncelleniyor" : "Rafın hazır"}</strong><span>{syncResult ? `${syncResult.uploaded} gönderildi · ${syncResult.downloaded} alındı` : "Son eşitleme otomatik yapılır"}</span></div>
          <button onClick={syncNow} disabled={busy}>{busy ? "Eşitleniyor…" : "Şimdi eşitle"}</button>
        </div>
        {message && <p className="account-message" role="status">{message}</p>}
      </section>

      <section className="account-settings-card account-settings">
        <div className="account-settings__heading"><span aria-hidden="true">♡</span><div><p>PROFİL AYARLARI</p><h3>Köşeni kişiselleştir</h3></div></div>
        <label>
          Görünen ad
          <input value={profile.display_name} maxLength={50} onChange={(event) => setProfile({ ...profile, display_name: event.target.value })} />
        </label>
        <fieldset>
          <legend>Liste görünürlüğü</legend>
          {(Object.keys(visibilityLabels) as Visibility[]).map((visibility) => (
            <label className="visibility-option" key={visibility}>
              <input type="radio" name="visibility" value={visibility} checked={profile.list_visibility === visibility} onChange={() => setProfile({ ...profile, list_visibility: visibility })} />
              <span><b>{visibilityLabels[visibility].title}</b><small>{visibilityLabels[visibility].detail}</small></span>
            </label>
          ))}
        </fieldset>
        <p className="account-caveat">Paylaşım sayfaları açılana kadar liste verisi teknik olarak yalnızca sana erişilebilir; tercih şimdiden saklanır.</p>
        <button className="account-save" onClick={() => saveProfile(profile)} disabled={busy}>Tercihlerimi kaydet ✦</button>
        <button className="account-signout" onClick={() => client.auth.signOut()}>Oturumu kapat</button>
      </section>
    </div>
  );
}
