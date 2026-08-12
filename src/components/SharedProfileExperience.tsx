import { useEffect, useMemo, useState } from "react";
import AnimeArtwork from "./AnimeArtwork";
import RotaCompanion from "./RotaCompanion";
import type { CatalogueAnime } from "../lib/catalogue-ui";
import { seasonLabels, typeLabels, visualFor } from "../lib/catalogue-ui";
import { personalStatusLabels, type PersonalStatus } from "../lib/personal-list";
import { calculateRotaStatistics } from "../lib/personal-statistics";
import { isShareToken, normalizeSharedProfile, type SharedListEntry, type SharedProfile } from "../lib/profile-sharing";
import { getSupabaseClient } from "../lib/supabase";
import PersonalStatisticsPanel from "./PersonalStatisticsPanel";

type Props = { dataVersion: string };
type SharedRecord = { anime: CatalogueAnime; entry: SharedListEntry };
type LoadState = "loading" | "ready" | "missing" | "error";

const shelfOrder = Object.keys(personalStatusLabels) as PersonalStatus[];
const shelfMeta: Record<PersonalStatus, { icon: string; note: string }> = {
  WATCHING: { icon: "▶", note: "Şu an eşlik ettiği rotalar." },
  COMPLETED: { icon: "✦", note: "Son jeneriğine kadar tamamladıkları." },
  PLANNED: { icon: "♡", note: "Bir gün başlayacak yolculuklar." },
  DROPPED: { icon: "↷", note: "Şimdilik yollarının ayrıldığı yapımlar." },
};

export default function SharedProfileExperience({ dataVersion }: Props) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [profile, setProfile] = useState<SharedProfile | null>(null);
  const [catalogue, setCatalogue] = useState<CatalogueAnime[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("rota")?.trim() ?? "";
    if (!client || !isShareToken(token)) {
      setLoadState("missing");
      return;
    }

    let active = true;
    Promise.all([
      client.rpc("get_shared_profile", { p_share_token: token }),
      fetch(`/data/catalogue.json?v=${encodeURIComponent(dataVersion)}`).then((response) => {
        if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`);
        return response.json() as Promise<CatalogueAnime[]>;
      }),
    ]).then(([profileResult, catalogueItems]) => {
      if (!active) return;
      if (profileResult.error) throw profileResult.error;
      const normalized = normalizeSharedProfile(profileResult.data);
      if (!normalized) {
        setLoadState("missing");
        return;
      }
      setProfile(normalized);
      setCatalogue(catalogueItems);
      setLoadState("ready");
    }).catch(() => {
      if (active) setLoadState("error");
    });

    return () => { active = false; };
  }, [client, dataVersion]);

  const records = useMemo(() => {
    const byId = new Map(catalogue.map((anime) => [anime.id, anime]));
    return (profile?.entries ?? [])
      .map((entry) => ({ entry, anime: byId.get(entry.anime_id) }))
      .filter((record): record is SharedRecord => Boolean(record.anime));
  }, [catalogue, profile]);

  const statistics = useMemo(() => calculateRotaStatistics(
    (profile?.entries ?? []).map((entry) => ({
      animeId: entry.anime_id,
      status: entry.status,
      progress: entry.progress,
      score: entry.score,
    })),
    catalogue,
  ), [catalogue, profile]);

  if (loadState === "loading") {
    return <div className="shared-profile-state catalogue-loading"><RotaCompanion mood="curious" message="Paylaşılan rafı arıyorum…" className="rota-companion--state" /><span></span><p>Rota bağlantısı açılıyor…</p></div>;
  }

  if (loadState === "missing") {
    return <div className="shared-profile-state my-list-empty"><RotaCompanion mood="curious" message="Bu rota iz bırakmamış." className="rota-companion--empty" /><span>404 / ROTA</span><h2>Bu paylaşım<br />kapalı.</h2><p>Bağlantı yenilenmiş, paylaşım kapatılmış veya adres eksik olabilir. Hesap sahibinden güncel bağlantıyı iste.</p><a href="/">Rota'ya dön <span>↗</span></a></div>;
  }

  if (loadState === "error" || !profile) {
    return <div className="shared-profile-state catalogue-empty companion-state"><RotaCompanion mood="error" message="Bağlantı biraz huysuz." className="rota-companion--state" /><span>!</span><h2>Raf şu an açılamadı.</h2><p>Bağlantını kontrol edip biraz sonra yeniden dene.</p></div>;
  }

  const counts = Object.fromEntries(shelfOrder.map((status) => [status, records.filter(({ entry }) => entry.status === status).length])) as Record<PersonalStatus, number>;
  const scored = records.filter(({ entry }) => entry.score !== null);
  const average = scored.length > 0
    ? scored.reduce((sum, { entry }) => sum + (entry.score ?? 0), 0) / scored.length
    : null;

  return (
    <div className="shared-profile">
      <header className="shared-profile__identity">
        <div className="shared-profile__avatar" aria-hidden="true">{profile.display_name.charAt(0).toLocaleUpperCase("tr-TR")}<span>✦</span></div>
        <div><p>{profile.list_visibility === "PUBLIC" ? "HERKESE AÇIK ROTA" : "PAYLAŞILAN ROTA"}</p><h2>{profile.display_name}</h2><small>Salt okunur anime köşesi · kişisel hesap bilgileri gizli</small></div>
        <RotaCompanion mood="happy" message="Misafirimiz var!" className="rota-companion--shared" />
      </header>

      <section className="shared-profile__summary" aria-label="Paylaşılan liste özeti">
        <div><strong>{records.length}</strong><span>anime</span></div>
        {shelfOrder.map((status) => <div key={status}><strong>{counts[status]}</strong><span>{personalStatusLabels[status]}</span></div>)}
        <div><strong>{average === null ? "—" : average.toFixed(1)}</strong><span>ortalama puan</span></div>
      </section>

      {profile.share_statistics && <PersonalStatisticsPanel statistics={statistics} mode="shared" />}

      {records.length === 0 ? (
        <div className="shared-profile__empty"><span>♡</span><h3>Bu rafta henüz anime yok.</h3><p>Rota yeni başladığında boş raf da hikâyenin parçasıdır.</p></div>
      ) : (
        <div className="shared-shelves">
          {shelfOrder.map((status) => {
            const shelfRecords = records.filter(({ entry }) => entry.status === status);
            if (shelfRecords.length === 0) return null;
            return (
              <section className={`shared-shelf shared-shelf--${status.toLowerCase()}`} key={status}>
                <header><span>{shelfMeta[status].icon}</span><div><p>ROTA RAFI</p><h2>{personalStatusLabels[status]}</h2><small>{shelfMeta[status].note}</small></div><b>{shelfRecords.length}</b></header>
                <div className="shared-shelf__grid">
                  {shelfRecords.map(({ anime, entry }) => {
                    const visual = visualFor(anime.id);
                    const progressPercent = anime.episodes > 0 ? Math.min(100, (entry.progress / anime.episodes) * 100) : 0;
                    return (
                      <article className="shared-anime-card" key={anime.id}>
                        <a className="shared-anime-card__art" href={`/anime/${anime.slug}`} aria-label={`${anime.title} detayını aç`}><AnimeArtwork art={visual.art} palette={visual.palette} posterPath={anime.poster?.path} title={anime.title} compact /></a>
                        <div className="shared-anime-card__body">
                          <p>{typeLabels[anime.type]} · {seasonLabels[anime.season.season]} {anime.season.year}</p>
                          <h3><a href={`/anime/${anime.slug}`}>{anime.title}</a></h3>
                          <div className="shared-anime-card__meta">
                            <span>Bölüm <b>{entry.progress} / {anime.episodes || "?"}</b></span>
                            {entry.score !== null && <strong>★ {entry.score}/10</strong>}
                          </div>
                          <div className="progress-track" aria-label={`${entry.progress} bölüm ilerleme`}><span style={{ width: `${progressPercent}%` }}></span></div>
                          {entry.note && <blockquote>“{entry.note}”</blockquote>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
