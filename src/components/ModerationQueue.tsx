import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatReviewDate, reportReasons, type ReportReason } from "../lib/community";
import { getSupabaseClient } from "../lib/supabase";

type QueueItem = {
  report_id: string;
  review_id: string;
  anime_id: string;
  review_body: string;
  author_name: string;
  reason: ReportReason;
  detail: string;
  review_status: "PUBLISHED" | "HIDDEN" | "REMOVED";
  reported_at: string;
};

export default function ModerationQueue() {
  const client = useMemo(() => getSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(Boolean(client));
  const [authorized, setAuthorized] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadQueue = useCallback(async (nextSession: Session | null) => {
    if (!client || !nextSession) {
      setItems([]);
      setAuthorized(true);
      setLoading(false);
      return;
    }
    const { data, error } = await client.rpc("get_review_moderation_queue");
    if (error) {
      setAuthorized(false);
      setItems([]);
    } else {
      setAuthorized(true);
      setItems((data ?? []) as QueueItem[]);
    }
    setLoading(false);
  }, [client]);

  useEffect(() => {
    if (!client) return;
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void loadQueue(data.session);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      window.setTimeout(() => void loadQueue(nextSession), 0);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [client, loadQueue]);

  const moderate = async (item: QueueItem, status: QueueItem["review_status"]) => {
    if (!client) return;
    const note = status === "PUBLISHED"
      ? "Rapor incelendi; ihlal bulunmadı."
      : status === "HIDDEN"
        ? "İnceleme, topluluk kuralları değerlendirmesi için gizlendi."
        : "İnceleme topluluk kurallarını ihlal ettiği için kaldırıldı.";
    setBusyId(item.report_id);
    setMessage("");
    const { error } = await client.rpc("moderate_anime_review", {
      p_review_id: item.review_id,
      p_review_status: status,
      p_note: note,
    });
    if (error) {
      setMessage("Moderasyon kararı kaydedilemedi.");
    } else {
      await loadQueue(session);
      setMessage(status === "PUBLISHED" ? "Rapor reddedildi; inceleme yayında kaldı." : "Moderasyon kararı uygulandı.");
    }
    setBusyId(null);
  };

  if (!client) return <div className="moderation-notice">Supabase bu ortamda bağlı değil.</div>;
  if (loading) return <div className="moderation-notice">Moderasyon kuyruğu yükleniyor…</div>;
  if (!session) return <div className="moderation-notice"><b>Oturum gerekli.</b><a href="/hesap">Orbit ile giriş yap →</a></div>;
  if (!authorized) return <div className="moderation-notice"><b>Bu alan yalnız Rota moderatörlerine açık.</b><span>Yetki, değiştirilemeyen Supabase uygulama rolünden doğrulanır.</span></div>;

  return (
    <section className="moderation-queue">
      <header><div><p className="eyebrow">SAHİP KUYRUĞU</p><h2>{items.length} açık rapor</h2></div><p>Raporlar içeriği otomatik gizlemez. Her karar insan incelemesiyle verilir.</p></header>
      {message && <p className="community-message" role="status">{message}</p>}
      {items.length === 0 ? <div className="moderation-empty">Kuyruk temiz. Rota huzurlu bir tur atabilir. ✦</div> : (
        <div className="moderation-list">
          {items.map((item) => (
            <article key={item.report_id}>
              <header><div><b>{item.author_name}</b><span>{formatReviewDate(item.reported_at)}</span></div><strong>{reportReasons[item.reason]}</strong></header>
              <p>{item.review_body}</p>
              {item.detail && <blockquote>Rapor ayrıntısı: {item.detail}</blockquote>}
              <small>Anime kimliği: {item.anime_id}</small>
              <footer>
                <button onClick={() => moderate(item, "PUBLISHED")} disabled={busyId === item.report_id}>İhlal yok</button>
                <button onClick={() => moderate(item, "HIDDEN")} disabled={busyId === item.report_id}>Gizle</button>
                <button onClick={() => moderate(item, "REMOVED")} disabled={busyId === item.report_id}>Kaldır</button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
