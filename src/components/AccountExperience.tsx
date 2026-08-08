import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { Session } from "@supabase/supabase-js";
import { syncPersonalList, type SyncResult } from "../lib/cloud-sync";
import { readPersonalList, subscribeToPersonalList } from "../lib/personal-list";
import { getSupabaseClient } from "../lib/supabase";

type Visibility = "PRIVATE" | "UNLISTED" | "PUBLIC";
type Profile = {
  display_name: string;
  list_visibility: Visibility;
};

const visibilityLabels: Record<Visibility, { title: string; detail: string }> = {
  PRIVATE: { title: "Yalnızca ben", detail: "Listen yalnız giriş yaptığın cihazlarda görünür." },
  UNLISTED: { title: "Bağlantıya sahip olanlar", detail: "Paylaşım sayfası açıldığında yalnız bağlantıyı bilenler erişebilir." },
  PUBLIC: { title: "Herkese açık", detail: "Paylaşım sayfası açıldığında profilin herkese görünür olabilir." },
};

const turnstileSiteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY;

export default function AccountExperience() {
  const client = useMemo(() => getSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(client));
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [profile, setProfile] = useState<Profile>({ display_name: "", list_visibility: "PRIVATE" });
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [localCount, setLocalCount] = useState(0);

  useEffect(() => {
    const refreshLocalCount = () => setLocalCount(Object.keys(readPersonalList().entries).length);
    refreshLocalCount();
    return subscribeToPersonalList(refreshLocalCount);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!client) return;
    let active = true;

    const loadProfile = async (nextSession: Session | null) => {
      if (!nextSession) return;
      const { data } = await client
        .from("profiles")
        .select("display_name,list_visibility")
        .eq("id", nextSession.user.id)
        .maybeSingle();
      if (active && data) setProfile(data as Profile);
    };

    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
      void loadProfile(data.session);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (nextSession) window.setTimeout(() => void loadProfile(nextSession), 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [client]);

  const sendMagicLink = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || !email.trim()) return;
    if (!captchaToken) {
      setMessage("Devam etmek için güvenlik doğrulamasını tamamla.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/hesap`,
        shouldCreateUser: true,
        captchaToken,
      },
    });
    setBusy(false);
    setCaptchaToken(null);
    setCaptchaKey((key) => key + 1);

    if (!error) {
      setCooldown(60);
      setMessage("Giriş bağlantısı e-posta adresine gönderildi.");
      return;
    }

    if (error.code === "over_email_send_rate_limit") {
      setMessage("Saatlik güvenli gönderim sınırına ulaşıldı. Bir süre sonra yeniden dene.");
    } else if (error.code === "over_request_rate_limit") {
      setMessage("Çok fazla deneme yapıldı. Birkaç dakika sonra yeniden dene.");
    } else if (error.code === "captcha_failed") {
      setMessage("Güvenlik doğrulaması başarısız oldu. Yeniden deneyebilirsin.");
    } else {
      setMessage("Giriş bağlantısı gönderilemedi. Lütfen biraz sonra yeniden dene.");
    }
  };

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
    setBusy(true);
    setMessage("");
    try {
      const result = await syncPersonalList(client, session.user.id);
      setSyncResult(result);
      setMessage(result.rejected.length > 0
        ? `Eşitleme tamamlandı; ${result.rejected.length} kayıt sunucu tarafından reddedildi ve bu cihazda korunuyor.`
        : "Yerel arşivin bulutla eşitlendi.");
    } catch (error) {
      setMessage(`Senkronizasyon tamamlanamadı: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`);
    } finally {
      setBusy(false);
    }
  };

  if (!client) {
    return (
      <div className="account-notice">
        <span>YEREL MOD</span>
        <h2>Bulut bağlantısı henüz etkin değil.</h2>
        <p>Hesap altyapısı hazır. Supabase projesinin URL ve publishable anahtarı tanımlanana kadar mevcut listen bu tarayıcıda güvenle çalışmaya devam eder.</p>
      </div>
    );
  }

  if (loading) return <div className="catalogue-loading"><span></span><p>Hesabın kontrol ediliyor…</p></div>;

  if (!session) {
    return (
      <div className="account-grid">
        <section className="account-card account-card--primary">
          <p className="eyebrow">ŞİFRESİZ VE GÜVENLİ</p>
          <h2>Rotanı yanında taşı.</h2>
          <p>E-posta adresine tek kullanımlık bir giriş bağlantısı göndeririz. Mevcut {localCount} yerel kaydın girişten sonra hesabınla birleştirilir.</p>
          <form className="account-form" onSubmit={sendMagicLink}>
            <label htmlFor="account-email">E-posta adresi</label>
            <input id="account-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            {turnstileSiteKey ? (
              <div className="account-turnstile" aria-label="Güvenlik doğrulaması">
                <Turnstile
                  key={captchaKey}
                  siteKey={turnstileSiteKey}
                  onSuccess={setCaptchaToken}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => {
                    setCaptchaToken(null);
                    setMessage("Güvenlik doğrulaması yüklenemedi. Sayfayı yenileyip yeniden dene.");
                  }}
                  options={{ language: "tr", size: "flexible", theme: "light" }}
                />
              </div>
            ) : (
              <p className="account-security-error">Güvenlik doğrulaması yapılandırılmamış.</p>
            )}
            <button disabled={busy || cooldown > 0 || !captchaToken}>
              {busy ? "Gönderiliyor…" : cooldown > 0 ? `Yeniden gönder (${cooldown})` : "Giriş bağlantısı gönder"}<span>→</span>
            </button>
          </form>
          {message && <p className="account-message" role="status">{message}</p>}
        </section>
        <aside className="account-card">
          <span className="account-card__number">{localCount.toString().padStart(2, "0")}</span>
          <h3>Yerel kayıt</h3>
          <p>Hesap açmak zorunlu değil. Giriş yapmazsan Rota aynı cihazda yerel çalışmaya devam eder.</p>
        </aside>
      </div>
    );
  }

  return (
    <div className="account-grid account-grid--signed-in">
      <section className="account-card account-card--primary">
        <p className="eyebrow">BAĞLI HESAP</p>
        <h2>{session.user.email}</h2>
        <p>Arşiv değişikliklerin yerelde anında kaydedilir ve bağlantı olduğunda Supabase hesabınla eşitlenir.</p>
        <div className="account-sync">
          <div><strong>{localCount}</strong><span>Bu cihazdaki kayıt</span></div>
          <button onClick={syncNow} disabled={busy}>{busy ? "Eşitleniyor…" : "Şimdi eşitle"}</button>
        </div>
        {syncResult && <small>{syncResult.uploaded} kayıt gönderildi · {syncResult.downloaded} kayıt alındı</small>}
        {message && <p className="account-message" role="status">{message}</p>}
      </section>

      <section className="account-card account-settings">
        <h3>Profil ve gizlilik</h3>
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
        <button className="account-save" onClick={() => saveProfile(profile)} disabled={busy}>Tercihleri kaydet</button>
        <button className="account-signout" onClick={() => client.auth.signOut()}>Oturumu kapat</button>
      </section>
    </div>
  );
}
