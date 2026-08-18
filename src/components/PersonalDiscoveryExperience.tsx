import { useEffect, useMemo, useState } from "react";
import type { CatalogueAnime } from "../lib/catalogue-ui";
import { displayTags, typeLabels, visualFor } from "../lib/catalogue-ui";
import {
  buildGentleReminders,
  buildPersonalTaste,
  discoveryPaths,
  recommendAnime,
  type DiscoveryPath,
} from "../lib/personal-discovery";
import { createPersonalEntry, readPersonalList, subscribeToPersonalList, type PersonalListEntry } from "../lib/personal-list";
import { readWatchJournal, subscribeToWatchJournal, type WatchJournalEntry } from "../lib/watch-journal";
import AnimeArtwork from "./AnimeArtwork";
import RotaCompanion from "./RotaCompanion";

type Props = { dataVersion: string };

export default function PersonalDiscoveryExperience({ dataVersion }: Props) {
  const [catalogue, setCatalogue] = useState<CatalogueAnime[]>([]);
  const [entries, setEntries] = useState<PersonalListEntry[]>([]);
  const [journal, setJournal] = useState<WatchJournalEntry[]>([]);
  const [path, setPath] = useState<DiscoveryPath>("FOR_YOU");
  const [pickIndex, setPickIndex] = useState(0);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const refreshList = () => setEntries(Object.values(readPersonalList().entries));
    const refreshJournal = () => setJournal(Object.values(readWatchJournal().entries));
    refreshList();
    refreshJournal();
    const unsubscribeList = subscribeToPersonalList(refreshList);
    const unsubscribeJournal = subscribeToWatchJournal(refreshJournal);

    fetch(`/data/catalogue.json?v=${encodeURIComponent(dataVersion)}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`);
        return response.json() as Promise<CatalogueAnime[]>;
      })
      .then((items) => { setCatalogue(items); setLoadState("ready"); })
      .catch(() => setLoadState("error"));

    return () => { unsubscribeList(); unsubscribeJournal(); };
  }, [dataVersion]);

  const profile = useMemo(() => buildPersonalTaste(entries, journal, catalogue), [catalogue, entries, journal]);
  const recommendations = useMemo(() => recommendAnime(catalogue, entries, journal, path), [catalogue, entries, journal, path]);
  const reminders = useMemo(() => buildGentleReminders(catalogue, entries, journal), [catalogue, entries, journal]);
  const selectedIndex = recommendations.length ? pickIndex % recommendations.length : 0;
  const featured = recommendations[selectedIndex];
  const alternatives = recommendations.filter((_, index) => index !== selectedIndex).slice(0, 6);

  const choosePath = (nextPath: DiscoveryPath) => {
    setPath(nextPath);
    setPickIndex(0);
  };

  const addToPlans = (animeId: string) => {
    createPersonalEntry(animeId);
    setPickIndex(0);
  };

  if (loadState === "loading") {
    return <div className="catalogue-loading companion-state"><RotaCompanion scene="listLoading" mood="curious" className="rota-companion--state" /><span></span><p>Kişisel pusulan hazırlanıyor…</p></div>;
  }
  if (loadState === "error") {
    return <div className="catalogue-empty companion-state"><RotaCompanion scene="listError" mood="error" className="rota-companion--state" /><span>!</span><h2>Öneriler şu anda açılamadı.</h2><p>Katalog bağlantısını kontrol edip sayfayı yenile.</p></div>;
  }

  return (
    <>
      <section className="personal-discovery__signals" aria-label="Öneri pusulası">
        <div>
          <p>KİŞİSEL PUSULA</p>
          <h2>{profile.hasHistory ? "Rafındaki izleri okuyorum." : "Önce katalogdan başlayalım."}</h2>
          <small>{profile.hasHistory ? "Puanların, izleme durumların ve günlük kayıtların yalnız bu cihazda eşleştirildi." : "Birkaç yapımı puanladığında tür, stüdyo ve format tercihlerin burada görünür."}</small>
        </div>
        <ul>
          {profile.genres.slice(0, 3).map((signal) => <li key={`genre-${signal.label}`}><span>Tür</span><b>{signal.label}</b></li>)}
          {profile.studios.slice(0, 1).map((signal) => <li key={`studio-${signal.label}`}><span>Stüdyo</span><b>{signal.label}</b></li>)}
          {profile.formats.slice(0, 1).map((signal) => <li key={`format-${signal.label}`}><span>Format</span><b>{signal.label}</b></li>)}
          {!profile.hasHistory && <li><span>Başlangıç</span><b>Şeffaf katalog seçimi</b></li>}
        </ul>
      </section>

      <section className="personal-discovery__paths" aria-labelledby="discovery-path-title">
        <header><div><p>NASIL BİR ŞEY?</p><h2 id="discovery-path-title">Bu akşamın yolunu seç.</h2></div><small>Filtreler kalıcı tercih oluşturmaz; yalnız bu seçimi değiştirir.</small></header>
        <div role="group" aria-label="Öneri yolu">
          {(Object.entries(discoveryPaths) as [DiscoveryPath, (typeof discoveryPaths)[DiscoveryPath]][]).map(([value, option]) => (
            <button className={path === value ? "is-active" : ""} type="button" aria-pressed={path === value} onClick={() => choosePath(value)} key={value}>
              <b>{option.label}</b><span>{option.note}</span>
            </button>
          ))}
        </div>
      </section>

      {featured ? <section className="personal-pick" aria-live="polite">
        <div className="personal-pick__art">
          <AnimeArtwork {...visualFor(featured.anime.id)} poster={featured.anime.poster} title={featured.anime.title} />
          <span>{featured.source === "PLANNED" ? "PLANLADIĞIN RAFTAN" : "KATALOGDAN"}</span>
        </div>
        <div className="personal-pick__copy">
          <p>BU AKŞAM NE İZLESEM?</p>
          <h2>{featured.anime.title}</h2>
          <div className="personal-pick__meta"><span>{typeLabels[featured.anime.type] ?? featured.anime.type}</span><span>{featured.anime.episodes || "?"} bölüm</span>{featured.anime.score && <span>★ {featured.anime.score.toFixed(1)} katalog</span>}</div>
          <h3>Neden bunu görüyorum?</h3>
          <ul>{featured.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          <div className="personal-pick__actions">
            <a href={`/anime/${featured.anime.slug}`}>Detayına git <span>↗</span></a>
            {featured.source === "CATALOGUE" && <button type="button" onClick={() => addToPlans(featured.anime.id)}>Planlananlara ekle</button>}
            <button type="button" onClick={() => setPickIndex((index) => index + 1)}>Başka seç <span>↻</span></button>
          </div>
        </div>
      </section> : <section className="personal-discovery__empty"><h2>Bu yolda uygun yapım bulamadım.</h2><p>Başka bir seçim yolu dene; rafındaki kayıtları değiştirmedim.</p></section>}

      {alternatives.length > 0 && <section className="personal-alternatives">
        <header><p>AYNI YOLDA BAŞKA İHTİMALLER</p><h2>Tek cevaba sıkışma.</h2></header>
        <div>{alternatives.map((recommendation) => {
          const visual = visualFor(recommendation.anime.id);
          return <article key={recommendation.anime.id}>
            <a className="personal-alternatives__art" href={`/anime/${recommendation.anime.slug}`}><AnimeArtwork {...visual} poster={recommendation.anime.poster} title={recommendation.anime.title} compact /></a>
            <div><p>{recommendation.source === "PLANNED" ? "PLANLADIĞIN RAFTAN" : displayTags(recommendation.anime.tags, 1)[0] ?? "KATALOG"}</p><h3><a href={`/anime/${recommendation.anime.slug}`}>{recommendation.anime.title}</a></h3><small>{recommendation.reasons[0]}</small></div>
          </article>;
        })}</div>
      </section>}

      <section className="gentle-reminders">
        <header><div><p>NAZİK HATIRLATMALAR</p><h2>Yarım kalanlar bağırmaz.</h2></div><small>Yalnız uzun süredir bekleyen “İzliyorum” ve “Planlıyorum” kayıtların görünür.</small></header>
        {reminders.length ? <div>{reminders.map((reminder) => (
          <article key={reminder.anime.id}><span>{reminder.entry.status === "WATCHING" ? "KALDIĞIN YER" : "PLAN RAFI"}</span><h3><a href={`/anime/${reminder.anime.slug}`}>{reminder.anime.title}</a></h3><p>{reminder.message}</p><a href={`/anime/${reminder.anime.slug}`}>İstersem dönerim <b>→</b></a></article>
        ))}</div> : <p className="gentle-reminders__empty">Şimdilik dürtüleyecek kadar eski bir kayıt yok. Güzel; Rota yapılacaklar listesine dönüşmesin.</p>}
      </section>

      <aside className="personal-discovery__method"><strong>Öneri nasıl çalışıyor?</strong><p>Rota; kendi puan, tür, stüdyo, format, liste durumu ve günlük geçmişini katalogla eşleştirir. Harici profil çıkarmaz, veriyi bir öneri servisine göndermez ve açıklamasız “uyum yüzdesi” üretmez.</p></aside>
    </>
  );
}
