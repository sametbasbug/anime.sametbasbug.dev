import { useEffect, useMemo, useState } from "react";
import type { CatalogueAnime } from "../lib/catalogue-ui";
import { loadBrowserCatalogue } from "../lib/catalogue-loader";
import { readPersonalList, subscribeToPersonalList, type PersonalListEntry } from "../lib/personal-list";
import { formatWatchTime } from "../lib/personal-statistics";
import {
  availableYearbookYears,
  buildRotaYearbook,
  formatYearbookPeriod,
  renderYearbookCardSvg,
  type YearbookAnimeHighlight,
  type YearbookRankedLabel,
} from "../lib/rota-yearbook";
import { readWatchJournal, subscribeToWatchJournal, type WatchJournalEntry } from "../lib/watch-journal";
import RotaCompanion from "./RotaCompanion";

type Props = {
  dataVersion: string;
  currentYear: number;
  currentMonth: number;
};

const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"] as const;
const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });

function localDate(value: string) {
  return dateFormatter.format(new Date(`${value}T12:00:00`));
}

function fileNameFor(periodLabel: string) {
  return `equinox-rota-yillik-${periodLabel.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü]+/giu, "-").replace(/^-|-$/gu, "")}.png`;
}

async function pngFileFromSvg(svg: string, fileName: string) {
  const source = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const sourceUrl = URL.createObjectURL(source);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = sourceUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Paylaşım kartı çizilemedi."));
    });

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Paylaşım kartı çizilemedi.");
    context.drawImage(image, 0, 0, 1200, 630);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("PNG üretilemedi.")),
      "image/png",
    ));
    return new File([blob], fileName, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function AnimeRanking({ title, items, suffix }: { title: string; items: YearbookAnimeHighlight[]; suffix: string }) {
  return <article className="yearbook-ranking">
    <header><p>ÖNE ÇIKAN</p><h3>{title}</h3></header>
    {items.length > 0 ? <ol>{items.map((item) => <li key={item.animeId}><a href={`/anime/${item.slug}`}>{item.title}</a><span>{item.value} {suffix}</span></li>)}</ol> : <p className="yearbook-ranking__empty">Bu dönem için güvenilir bir eşleşme yok.</p>}
  </article>;
}

function LabelRanking({ title, items }: { title: string; items: YearbookRankedLabel[] }) {
  return <article className="yearbook-ranking">
    <header><p>EĞİLİM</p><h3>{title}</h3></header>
    {items.length > 0 ? <ol>{items.map((item) => <li key={item.label}><strong>{item.label}</strong><span>{item.episodes} bölüm</span></li>)}</ol> : <p className="yearbook-ranking__empty">Bu başlık için yeterli katalog verisi yok.</p>}
  </article>;
}

export default function YearbookExperience({ dataVersion, currentYear, currentMonth }: Props) {
  const [catalogue, setCatalogue] = useState<CatalogueAnime[]>([]);
  const [journalEntries, setJournalEntries] = useState<WatchJournalEntry[]>([]);
  const [personalEntries, setPersonalEntries] = useState<PersonalListEntry[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [mode, setMode] = useState<"year" | "month">("year");
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [calendarYear, setCalendarYear] = useState(currentYear);
  const [cardEnabled, setCardEnabled] = useState(false);
  const [includeTitles, setIncludeTitles] = useState(false);
  const [cardState, setCardState] = useState<"idle" | "working">("idle");
  const [cardMessage, setCardMessage] = useState("");

  useEffect(() => {
    const now = new Date();
    const browserYear = now.getFullYear();
    const browserMonth = now.getMonth() + 1;
    setCalendarYear(browserYear);
    setYear((value) => value === currentYear ? browserYear : value);
    setMonth((value) => value === currentMonth ? browserMonth : value);
  }, [currentMonth, currentYear]);

  useEffect(() => {
    const refreshJournal = () => setJournalEntries(Object.values(readWatchJournal().entries));
    const refreshPersonal = () => setPersonalEntries(Object.values(readPersonalList().entries));
    refreshJournal();
    refreshPersonal();
    const unsubscribeJournal = subscribeToWatchJournal(refreshJournal);
    const unsubscribePersonal = subscribeToPersonalList(refreshPersonal);

    loadBrowserCatalogue(dataVersion)
      .then((items) => { setCatalogue(items); setLoadState("ready"); })
      .catch(() => setLoadState("error"));

    return () => {
      unsubscribeJournal();
      unsubscribePersonal();
    };
  }, [dataVersion]);

  const years = useMemo(() => availableYearbookYears(journalEntries, calendarYear), [calendarYear, journalEntries]);
  useEffect(() => {
    if (!years.includes(year)) setYear(years[0] ?? calendarYear);
  }, [calendarYear, year, years]);

  const period = mode === "year" ? { kind: "year" as const, year } : { kind: "month" as const, year, month };
  const summary = useMemo(
    () => buildRotaYearbook(journalEntries, personalEntries, catalogue, period),
    [catalogue, journalEntries, period.kind, period.year, mode === "month" ? month : 0, personalEntries],
  );
  const periodLabel = formatYearbookPeriod(period);
  const watchTimeLabel = summary.durationKnownEpisodes > 0 ? formatWatchTime(summary.watchSeconds) : "Süre belirsiz";
  const timelineMax = Math.max(1, ...summary.timeline.map((bucket) => bucket.episodes));
  const cardSvg = useMemo(() => renderYearbookCardSvg({
    periodLabel,
    episodeCount: summary.episodeCount,
    animeCount: summary.animeCount,
    activeDays: summary.activeDays,
    completedCount: summary.completedAnime.length,
    watchTimeLabel,
    highlights: includeTitles ? summary.topAnime.map((item) => item.title) : undefined,
  }), [includeTitles, periodLabel, summary.activeDays, summary.animeCount, summary.completedAnime.length, summary.episodeCount, summary.topAnime, watchTimeLabel]);
  const cardPreview = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cardSvg)}`;

  const createCard = async (share: boolean) => {
    setCardState("working");
    setCardMessage("");
    try {
      const file = await pngFileFromSvg(cardSvg, fileNameFor(periodLabel));
      if (share && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${periodLabel} Rota yıllığım`, files: [file] });
        setCardMessage("Kart paylaşım menüsüne gönderildi.");
      } else {
        downloadFile(file);
        setCardMessage(share ? "Bu tarayıcı dosya paylaşımını desteklemedi; PNG indirildi." : "PNG kartı indirildi.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") setCardMessage("Paylaşım iptal edildi.");
      else setCardMessage("Kart şu anda üretilemedi. Sayfayı yenileyip yeniden dene.");
    } finally {
      setCardState("idle");
    }
  };

  if (loadState === "loading") {
    return <div className="catalogue-loading companion-state"><RotaCompanion scene="yearbookLoading" mood="curious" className="rota-companion--state" /><span></span><p>Günlük yıldızlara işleniyor…</p></div>;
  }
  if (loadState === "error") {
    return <div className="catalogue-empty companion-state"><RotaCompanion scene="listError" mood="error" className="rota-companion--state" /><span>!</span><h2>Rota yıllığı açılamadı.</h2><p>Katalog bağlantısını kontrol edip sayfayı yenile.</p></div>;
  }

  return <>
    <section className="yearbook-controls" aria-labelledby="yearbook-period-title">
      <header><div><p>DÖNEM SEÇİMİ</p><h2 id="yearbook-period-title">Hangi sayfaya dönelim?</h2></div><small>Günlük tarihleri kaydettiğin yerel gün olarak yorumlanır; saat dilimi dönüşümü yapılmaz.</small></header>
      <div>
        <div className="yearbook-mode" role="group" aria-label="Özet aralığı">
          <button type="button" className={mode === "year" ? "is-active" : ""} aria-pressed={mode === "year"} onClick={() => setMode("year")}>Yıllık</button>
          <button type="button" className={mode === "month" ? "is-active" : ""} aria-pressed={mode === "month"} onClick={() => setMode("month")}>Aylık</button>
        </div>
        <label>Yıl<select value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
        {mode === "month" && <label>Ay<select value={month} onChange={(event) => setMonth(Number(event.target.value))}>{months.map((label, index) => <option value={index + 1} key={label}>{label}</option>)}</select></label>}
      </div>
    </section>

    <section className="yearbook-overview" aria-live="polite">
      <header><div><p>{mode === "year" ? "ROTA YILLIĞI" : "AYLIK ROTA"}</p><h2>{periodLabel}</h2></div><span className={`is-${summary.state}`}>{summary.state === "ready" ? "Özet hazır" : summary.state === "early" ? "İlk izler" : "Henüz boş"}</span></header>
      <div className="yearbook-metrics">
        <article><strong>{summary.episodeCount}</strong><span>izlenen bölüm</span></article>
        <article><strong>{summary.animeCount}</strong><span>anime</span></article>
        <article><strong>{watchTimeLabel}</strong><span>yaklaşık süre</span></article>
        <article><strong>{summary.activeDays}</strong><span>aktif gün</span></article>
        <article><strong>{summary.completedAnime.length}</strong><span>finali doğrulanan</span></article>
      </div>
      {summary.durationKnownEpisodes > 0 && summary.durationKnownEpisodes < summary.episodeCount && <p className="yearbook-coverage">Yaklaşık süre, bölüm süresi bilinen {summary.durationKnownEpisodes}/{summary.episodeCount} günlük bölümü üzerinden hesaplandı.</p>}
      {summary.unmatchedAnimeCount > 0 && <p className="yearbook-coverage">{summary.unmatchedAnimeCount} eski günlük başlığı güncel katalogla eşleşmedi; bölüm ve gün sayısına katıldı, eğilimlere katılmadı.</p>}
    </section>

    {summary.state === "empty" ? <section className="yearbook-empty">
      <RotaCompanion scene="yearbookEmpty" mood="curious" className="rota-companion--empty" />
      <div><p>BU DÖNEM SESSİZ</p><h2>Uyduracak bir hikâyemiz yok.</h2><span>Seçili dönemde günlük kaydı bulunmuyor. Başka bir ay/yıl seçebilir veya izlediğin ilk bölümü günlüğe ekleyebilirsin.</span><a href="/gunluk">Günlüğü aç <b>→</b></a></div>
    </section> : <>
      <section className="yearbook-rhythm" aria-labelledby="yearbook-rhythm-title">
        <header><div><p>İZLEME RİTMİ</p><h2 id="yearbook-rhythm-title">Dönemin temposu.</h2></div><small>{mode === "year" ? "Her sütun bir ayı" : "Her sütun ay içindeki bir haftalık aralığı"} ve kaydedilen bölüm sayısını gösterir.</small></header>
        <div className={`yearbook-chart ${mode === "month" ? "is-month" : "is-year"}`}>
          {summary.timeline.map((bucket) => <div key={bucket.key} aria-label={`${bucket.label}: ${bucket.episodes} bölüm`}>
            <span><i style={{ height: bucket.episodes > 0 ? `${Math.max(8, (bucket.episodes / timelineMax) * 100)}%` : "0%" }}><b>{bucket.episodes || ""}</b></i></span>
            <small>{bucket.label}</small>
          </div>)}
        </div>
      </section>

      {summary.state === "early" ? <section className="yearbook-early">
        <strong>İlk izler kayda geçti.</strong><p>Bu dönemde karşılaştırmalı tür, stüdyo veya tempo eğilimi söylemek için henüz yeterli çeşitlilik yok. Kesin sayıları gösterdim; boşlukları tahminle doldurmadım.</p>
      </section> : <section className="yearbook-highlights" aria-label="Dönem öne çıkanları">
        <AnimeRanking title="En çok izlenenler" items={summary.topAnime} suffix="bölüm" />
        <LabelRanking title="Türler" items={summary.topGenres} />
        <LabelRanking title="Stüdyolar" items={summary.topStudios} />
        <AnimeRanking title="En yüksek puanların" items={summary.topRated} suffix="puan" />
      </section>}

      <section className="yearbook-milestones" aria-labelledby="yearbook-milestones-title">
        <header><p>KİŞİSEL DÖNÜM NOKTALARI</p><h2 id="yearbook-milestones-title">Günlüğün söylediği kadar.</h2></header>
        <div>
          <article><span>EN YOĞUN GÜN</span><strong>{summary.busiestDay ? localDate(summary.busiestDay.date) : "—"}</strong><small>{summary.busiestDay ? `${summary.busiestDay.episodes} bölüm · ${summary.busiestDay.animeCount} anime` : "Kayıt yok"}</small></article>
          <article><span>EN UZUN SERİ</span><strong>{summary.longestStreak > 1 ? `${summary.longestStreak} gün` : "Henüz yok"}</strong><small>{summary.longestStreak > 1 ? "Aralıksız günlük kaydı" : "İki ardışık aktif gün oluşmadı"}</small></article>
          <article><span>DÖNEM ARALIĞI</span><strong>{summary.firstDay && summary.lastDay ? `${localDate(summary.firstDay)} — ${localDate(summary.lastDay)}` : "—"}</strong><small>İlk ve son günlük kaydı</small></article>
          <article><span>DOĞRULANAN FİNALLER</span><strong>{summary.completedAnime.length}</strong><small>Günlükte final bölümü görünen güncel “Tamamladım” kayıtları</small></article>
        </div>
      </section>

      <section className="yearbook-share" aria-labelledby="yearbook-share-title">
        <header><div><p>İSTEĞE BAĞLI PAYLAŞIM</p><h2 id="yearbook-share-title">Özet kartın, kontrolün sende.</h2></div><span>Kapalı başlar · bu cihazda üretilir</span></header>
        <label className="yearbook-share__optin"><input type="checkbox" checked={cardEnabled} onChange={(event) => { setCardEnabled(event.target.checked); if (!event.target.checked) { setIncludeTitles(false); setCardMessage(""); } }} /><span><strong>Paylaşım kartını hazırla</strong><small>Kart üretilene kadar hiçbir paylaşım işlemi yapılmaz. Kişisel notlar, hesap kimliği ve senkronizasyon verileri hiçbir zaman karta girmez.</small></span></label>
        {cardEnabled && <div className="yearbook-share__workspace">
          <div className="yearbook-card-preview"><img src={cardPreview} alt={`${periodLabel} Rota paylaşım kartı önizlemesi`} /></div>
          <div className="yearbook-share__controls">
            <label><input type="checkbox" checked={includeTitles} onChange={(event) => setIncludeTitles(event.target.checked)} /><span><strong>Anime adlarını karta ekle</strong><small>Varsayılan kapalıdır. Açarsan en çok izlediğin üç başlık karta görünür biçimde yazılır.</small></span></label>
            <div><button type="button" disabled={cardState === "working"} onClick={() => void createCard(false)}>PNG indir</button><button type="button" disabled={cardState === "working"} onClick={() => void createCard(true)}>Paylaş <b>↗</b></button></div>
            {cardMessage && <p role="status">{cardMessage}</p>}
          </div>
        </div>}
      </section>
    </>}

    <aside className="yearbook-method"><strong>Bu özet neyi biliyor?</strong><p>Bölüm, anime ve aktif gün sayıları seçili dönemdeki günlük kayıtlarından gelir. Tür, stüdyo, süre ve puanlar güncel katalog ile kişisel arşivin cihazdaki kopyasıyla eşleştirilir. “Final” yalnız günlükte yapımın son bölümü görüldüğünde ve kayıt bugün de “Tamamladım” durumundaysa sayılır; geçmişteki durum değişiklikleri tahmin edilmez.</p></aside>
  </>;
}
