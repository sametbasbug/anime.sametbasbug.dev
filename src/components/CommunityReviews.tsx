import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  REPORT_DETAIL_MAX_LENGTH,
  REVIEW_BODY_MAX_LENGTH,
  averageReviewScore,
  formatReviewDate,
  reportReasons,
  reviewBodyLength,
  validateReviewDraft,
  type MyReview,
  type PublicReview,
  type ReportReason,
  type ReviewDraft,
} from "../lib/community";
import { getSupabaseClient } from "../lib/supabase";

type Props = {
  animeId: string;
  animeTitle: string;
};

const emptyDraft: ReviewDraft = { body: "", score: null, containsSpoiler: false };

function messageForError(error: { message?: string } | null, fallback: string) {
  const message = error?.message ?? "";
  if (message.includes("rate limit")) return "Çok hızlı işlem yaptın. Biraz bekleyip yeniden dene.";
  if (message.includes("already reported")) return "Bu incelemeyi daha önce raporladın.";
  if (message.includes("Links are not allowed")) return "İncelemelerde bağlantı paylaşılmaz.";
  if (message.includes("Moderated reviews")) return "Moderatör işlemi uygulanmış inceleme düzenlenemez.";
  return fallback;
}

export default function CommunityReviews({ animeId, animeTitle }: Props) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [myReview, setMyReview] = useState<MyReview | null>(null);
  const [draft, setDraft] = useState<ReviewDraft>(emptyDraft);
  const [loading, setLoading] = useState(Boolean(client));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(() => new Set());
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("SPOILER");
  const [reportDetail, setReportDetail] = useState("");

  const loadReviews = useCallback(async () => {
    if (!client) return;
    const { data, error } = await client.rpc("get_anime_reviews", { p_anime_id: animeId });
    if (error) throw error;
    setReviews((data ?? []) as PublicReview[]);
  }, [animeId, client]);

  const loadMyReview = useCallback(async (nextSession: Session | null) => {
    if (!client || !nextSession) {
      setMyReview(null);
      setDraft(emptyDraft);
      return;
    }
    const { data, error } = await client.rpc("get_my_anime_review", { p_anime_id: animeId });
    if (error) throw error;
    const review = ((data ?? [])[0] ?? null) as MyReview | null;
    setMyReview(review);
    setDraft(review
      ? { body: review.body, score: review.score, containsSpoiler: review.contains_spoiler }
      : emptyDraft);
  }, [animeId, client]);

  const refresh = useCallback(async (nextSession: Session | null) => {
    if (!client) return;
    await Promise.all([loadReviews(), loadMyReview(nextSession)]);
  }, [client, loadMyReview, loadReviews]);

  useEffect(() => {
    if (!client) return;
    let active = true;

    client.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      try {
        await refresh(data.session);
      } catch {
        if (active) setMessage("Topluluk alanı şu an yüklenemedi.");
      } finally {
        if (active) setLoading(false);
      }
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      window.setTimeout(() => {
        void refresh(nextSession).catch(() => setMessage("Topluluk alanı şu an yüklenemedi."));
      }, 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [client, refresh]);

  const saveReview = async () => {
    if (!client || !session) return;
    const validationMessage = validateReviewDraft(draft);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setBusy(true);
    setMessage("");
    const { error } = await client.rpc("save_anime_review", {
      p_anime_id: animeId,
      p_body: draft.body.trim(),
      p_score: draft.score,
      p_contains_spoiler: draft.containsSpoiler,
    });
    if (error) {
      setMessage(messageForError(error, "İnceleme kaydedilemedi. Biraz sonra yeniden dene."));
      setBusy(false);
      return;
    }
    await refresh(session);
    setMessage(myReview ? "İncelemen güncellendi." : "İncelemen yayımlandı.");
    setBusy(false);
  };

  const deleteReview = async () => {
    if (!client || !session || !myReview) return;
    if (!window.confirm("İncelemeni kalıcı olarak silmek istiyor musun?")) return;
    setBusy(true);
    setMessage("");
    const { error } = await client.rpc("delete_my_anime_review", { p_review_id: myReview.id });
    if (error) {
      setMessage("İnceleme silinemedi. Biraz sonra yeniden dene.");
      setBusy(false);
      return;
    }
    await refresh(session);
    setMessage("İncelemen silindi.");
    setBusy(false);
  };

  const submitReport = async (reviewId: string) => {
    if (!client || !session) return;
    setBusy(true);
    setMessage("");
    const { error } = await client.rpc("report_anime_review", {
      p_review_id: reviewId,
      p_reason: reportReason,
      p_detail: reportDetail.trim(),
    });
    if (error) {
      setMessage(messageForError(error, "Rapor gönderilemedi. Biraz sonra yeniden dene."));
      setBusy(false);
      return;
    }
    setReportingId(null);
    setReportReason("SPOILER");
    setReportDetail("");
    setMessage("Rapor moderasyon kuyruğuna gönderildi. Teşekkürler.");
    setBusy(false);
  };

  const average = averageReviewScore(reviews);
  const draftLength = reviewBodyLength(draft.body);
  const isModerated = myReview && myReview.moderation_status !== "PUBLISHED";

  return (
    <section className="community-reviews" aria-labelledby="community-title">
      <header className="community-reviews__heading">
        <div>
          <p className="eyebrow">ROTA TOPLULUĞU · SPOILER KONTROLLÜ</p>
          <h2 id="community-title">Yolcular ne düşünüyor?</h2>
          <p>{animeTitle} hakkındaki kişisel değerlendirmeler. İncelemeler düz metindir; bağlantı ve korsan yönlendirmesi kabul edilmez.</p>
        </div>
        <div className="community-reviews__summary" aria-label="Topluluk özeti">
          <strong>{reviews.length}</strong><span>inceleme</span>
          <b>{average === null ? "—" : `★ ${average.toFixed(1)}`}</b><span>ortalama</span>
        </div>
      </header>

      {!client && <div className="community-notice">Topluluk altyapısı bu ortamda bağlı değil.</div>}
      {client && loading && <div className="community-notice">İncelemeler yükleniyor…</div>}

      {client && !loading && (
        <>
          <section className="review-composer" aria-label="İnceleme yaz">
            {!session ? (
              <div className="review-composer__guest">
                <div><b>Senin rotan nasıldı?</b><span>İnceleme yazmak ve rapor göndermek için Orbit ile giriş yap.</span></div>
                <a href="/hesap">Orbit ile giriş yap →</a>
              </div>
            ) : isModerated ? (
              <div className="community-notice community-notice--warning">
                <b>İncelemen moderasyon işlemi nedeniyle yayında değil.</b>
                {myReview.moderation_note && <span>{myReview.moderation_note}</span>}
              </div>
            ) : (
              <div className="review-composer__form">
                <div className="review-composer__topline">
                  <div><b>{myReview ? "İncelemeni düzenle" : "İncelemeni yaz"}</b><span>Anime başına tek inceleme yayımlayabilirsin.</span></div>
                  <label>Puan
                    <select name="review-score" value={draft.score ?? ""} onChange={(event) => setDraft({ ...draft, score: event.target.value ? Number(event.target.value) : null })}>
                      <option value="">Puansız</option>
                      {Array.from({ length: 10 }, (_, index) => 10 - index).map((score) => <option key={score} value={score}>{score} / 10</option>)}
                    </select>
                  </label>
                </div>
                <textarea
                  name="review-body"
                  value={draft.body}
                  maxLength={REVIEW_BODY_MAX_LENGTH}
                  placeholder="Neyi sevdin, kimlere önerirsin? Konuyu özetlemek yerine kendi deneyimini anlat."
                  onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                />
                <div className="review-composer__footer">
                  <label className="review-spoiler-toggle">
                    <input name="review-contains-spoiler" type="checkbox" checked={draft.containsSpoiler} onChange={(event) => setDraft({ ...draft, containsSpoiler: event.target.checked })} />
                    <span><b>Spoiler içeriyor</b><small>Okuyucu açana kadar metin gizlenir.</small></span>
                  </label>
                  <span className={draftLength > REVIEW_BODY_MAX_LENGTH ? "is-error" : ""}>{draftLength}/{REVIEW_BODY_MAX_LENGTH}</span>
                  <button onClick={saveReview} disabled={busy}>{busy ? "Kaydediliyor…" : myReview ? "Güncelle" : "Yayımla"}</button>
                </div>
                {myReview && <button className="review-delete" onClick={deleteReview} disabled={busy}>İncelememi sil</button>}
              </div>
            )}
          </section>

          {message && <p className="community-message" role="status">{message}</p>}

          <div className="review-list">
            {reviews.length === 0 ? (
              <div className="community-empty"><span aria-hidden="true">✦</span><b>İlk rota notu henüz yazılmadı.</b><p>Bu animeyi izlediysen topluluğun ilk incelemesini bırakabilirsin.</p></div>
            ) : reviews.map((review) => {
              const spoilerVisible = !review.contains_spoiler || revealedSpoilers.has(review.id);
              const isOwn = review.id === myReview?.id;
              return (
                <article className="review-card" key={review.id}>
                  <header>
                    <div className="review-avatar" aria-hidden="true">{review.author_name.charAt(0).toLocaleUpperCase("tr-TR")}</div>
                    <div><b>{review.author_name}</b><span>{formatReviewDate(review.updated_at)}{isOwn ? " · Senin incelemen" : ""}</span></div>
                    {review.score !== null && <strong>★ {review.score}/10</strong>}
                  </header>
                  {review.contains_spoiler && <span className="review-spoiler-label">SPOILER İÇERİR</span>}
                  {spoilerVisible ? (
                    <p className="review-card__body">{review.body}</p>
                  ) : (
                    <button className="review-spoiler-cover" onClick={() => setRevealedSpoilers((current) => new Set(current).add(review.id))}>
                      <b>Spoiler perdesi kapalı</b><span>İncelemeyi kendi isteğinle göster</span>
                    </button>
                  )}
                  {!isOwn && (
                    <footer>
                      {reportingId === review.id ? (
                        <div className="review-report-form">
                          {!session ? <a href="/hesap">Raporlamak için giriş yap →</a> : (
                            <>
                              <label>Neden
                                <select name="report-reason" value={reportReason} onChange={(event) => setReportReason(event.target.value as ReportReason)}>
                                  {Object.entries(reportReasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                              </label>
                              <label>Ayrıntı <small>(isteğe bağlı)</small>
                                <textarea name="report-detail" value={reportDetail} maxLength={REPORT_DETAIL_MAX_LENGTH} onChange={(event) => setReportDetail(event.target.value)} />
                              </label>
                              <div><button onClick={() => setReportingId(null)}>Vazgeç</button><button onClick={() => submitReport(review.id)} disabled={busy}>Raporu gönder</button></div>
                            </>
                          )}
                        </div>
                      ) : <button className="review-report-open" onClick={() => setReportingId(review.id)}>Raporla</button>}
                    </footer>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
