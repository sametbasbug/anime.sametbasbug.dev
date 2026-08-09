import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { syncPersonalList, type SyncResult } from "../lib/cloud-sync";
import { readPersonalList, subscribeToPersonalList } from "../lib/personal-list";
import { getSupabaseClient } from "../lib/supabase";

type Visibility = "PRIVATE" | "UNLISTED" | "PUBLIC";
type Profile = {
  display_name: string;
  list_visibility: Visibility;
};

type GoogleCredentialResponse = { credential?: string };
type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        nonce: string;
        auto_select: boolean;
        use_fedcm_for_prompt: boolean;
      }) => void;
      renderButton: (element: HTMLElement, options: Record<string, string | number>) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const googleClientId = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID?.trim();

function createNonce() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hashNonce(nonce: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function loadGoogleIdentity() {
  if (window.google) return Promise.resolve(window.google);
  return new Promise<GoogleIdentity>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
    const script = existing ?? document.createElement("script");
    const handleLoad = () => window.google ? resolve(window.google) : reject(new Error("Google Identity Services yüklenemedi."));
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", () => reject(new Error("Google Identity Services yüklenemedi.")), { once: true });
    if (!existing) {
      script.src = "https://accounts.google.com/gsi/client?hl=tr";
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = "true";
      document.head.append(script);
    }
  });
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
  const googleButtonRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!client || session || loading || !googleButtonRef.current) return;
    let active = true;

    const mountGoogleButton = async () => {
      if (!googleClientId) {
        setMessage("Google girişi henüz yapılandırılmadı.");
        return;
      }
      try {
        const nonce = createNonce();
        const hashedNonce = await hashNonce(nonce);
        const google = await loadGoogleIdentity();
        if (!active || !googleButtonRef.current) return;
        google.accounts.id.initialize({
          client_id: googleClientId,
          nonce: hashedNonce,
          auto_select: false,
          use_fedcm_for_prompt: true,
          callback: async ({ credential }) => {
            if (!credential) {
              setMessage("Google kimliği alınamadı. Lütfen yeniden dene.");
              return;
            }
            setBusy(true);
            setMessage("");
            const { error } = await client.auth.signInWithIdToken({
              provider: "google",
              token: credential,
              nonce,
            });
            if (error && active) setMessage("Google ile giriş tamamlanamadı. Lütfen yeniden dene.");
            if (active) setBusy(false);
          },
        });
        googleButtonRef.current.replaceChildren();
        google.accounts.id.renderButton(googleButtonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.min(400, googleButtonRef.current.clientWidth || 400),
        });
      } catch {
        if (active) setMessage("Google giriş düğmesi yüklenemedi. Bağlantını kontrol edip yeniden dene.");
      }
    };

    void mountGoogleButton();
    return () => { active = false; };
  }, [client, loading, session]);

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

  const googleName = typeof session?.user.user_metadata?.full_name === "string"
    ? session.user.user_metadata.full_name.trim()
    : "";
  const displayName = profile.display_name.trim() || googleName || "Anime yolcusu";
  const profileInitial = displayName.charAt(0).toLocaleUpperCase("tr-TR");

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
          <p className="eyebrow">GOOGLE İLE GÜVENLİ GİRİŞ</p>
          <h2>Rafın, her cihazda seninle.</h2>
          <p className="account-intro">Google hesabınla giriş yaptığında bu cihazdaki {localCount} kayıt hesabınla birleşir. Rota, Google parolanı görmez veya saklamaz.</p>

          <ul className="account-benefits" aria-label="Hesap özellikleri">
            <li><i>01</i><span><b>Önce cihazında</b><small>Değişikliklerin anında kaydolur.</small></span></li>
            <li><i>02</i><span><b>Sonra bulutta</b><small>İstersen diğer cihazlarına taşınır.</small></span></li>
            <li><i>03</i><span><b>Kontrol sende</b><small>Listen varsayılan olarak özeldir.</small></span></li>
          </ul>

          <div className="account-google" ref={googleButtonRef} aria-busy={busy}></div>
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
