import { useEffect, useMemo, useState } from "react";
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

export default function AccountExperience() {
  const client = useMemo(() => getSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(client));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile>({ display_name: "", list_visibility: "PRIVATE" });
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [localCount, setLocalCount] = useState(0);

  useEffect(() => {
    const refreshLocalCount = () => setLocalCount(Object.keys(readPersonalList().entries).length);
    refreshLocalCount();
    return subscribeToPersonalList(refreshLocalCount);
  }, []);

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

  const signInWithGoogle = async () => {
    if (!client) return;
    setBusy(true);
    setMessage("");
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/hesap`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (!error) return;
    setBusy(false);
    setMessage("Google ile giriş başlatılamadı. Lütfen biraz sonra yeniden dene.");
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
          <p className="eyebrow">GOOGLE İLE GÜVENLİ GİRİŞ</p>
          <h2>Rotanı yanında taşı.</h2>
          <p>Google hesabınla giriş yaptığında mevcut {localCount} yerel kaydın hesabınla birleştirilir. Rota Google parolanı görmez veya saklamaz.</p>
          <button className="account-google" type="button" onClick={signInWithGoogle} disabled={busy}>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path fill="#4285f4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
              <path fill="#34a853" d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
              <path fill="#fbbc05" d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.64.39 3.2 1.04 4.55l3.35-2.62Z" />
              <path fill="#ea4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5L18.7 4.57A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
            </svg>
            <span>{busy ? "Google'a yönlendiriliyor…" : "Google ile devam et"}</span>
            <b aria-hidden="true">→</b>
          </button>
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
