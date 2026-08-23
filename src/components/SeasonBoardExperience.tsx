import { useEffect, useMemo, useState } from "react";
import type { CatalogueAnime } from "../lib/catalogue-ui";
import { loadBrowserCatalogue } from "../lib/catalogue-loader";
import { displayTags, seasonLabels, typeLabels } from "../lib/catalogue-ui";
import {
  availableSeasonYears,
  seasonBoardItems,
  seasonCodes,
  seasonForDate,
  type SeasonBoardView,
  type SeasonCode,
} from "../lib/season-board";
import { personalStatusLabels, readPersonalList, subscribeToPersonalList, type PersonalListEntry } from "../lib/personal-list";
import AnimeCard from "./AnimeCard";
import RotaCompanion from "./RotaCompanion";

type Props = {
  dataVersion: string;
  initialYear: number;
  initialSeason: SeasonCode;
  sourceRelease: string;
  sourceLastUpdate: string;
};

type StatusFilter = "ALL" | "ONGOING" | "FINISHED" | "UPCOMING";

const views: Array<{ value: SeasonBoardView; label: string; note: string }> = [
  { value: "SEASON", label: "Sezon seçkisi", note: "Bu dönemde başlayanlar" },
  { value: "CONTINUING", label: "Devam eden", note: "Önceki sezondan sürenler" },
  { value: "UPCOMING", label: "Yaklaşan", note: "Önümüzdeki beş sezon" },
];

const statuses: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Tüm durumlar" },
  { value: "ONGOING", label: "Devam ediyor" },
  { value: "UPCOMING", label: "Yakında" },
  { value: "FINISHED", label: "Tamamlandı" },
];

function formatSourceDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export default function SeasonBoardExperience({ dataVersion, initialYear, initialSeason, sourceRelease, sourceLastUpdate }: Props) {
  const [catalogue, setCatalogue] = useState<CatalogueAnime[]>([]);
  const [entries, setEntries] = useState<Record<string, PersonalListEntry>>({});
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [year, setYear] = useState(initialYear);
  const [season, setSeason] = useState<SeasonCode>(initialSeason);
  const [view, setView] = useState<SeasonBoardView>("SEASON");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [format, setFormat] = useState("ALL");
  const [genre, setGenre] = useState("ALL");
  const [personalOnly, setPersonalOnly] = useState(false);

  /* Açılış sezonu sunucudan DERLEME anındaki tarihle geliyor; site statik
   * olduğu için o değer bir sonraki dağıtıma kadar donuyor. Tarayıcı gerçek
   * tarihi biliyor, o yüzden son sözü o söylüyor.
   *
   * Düzeltme yalnız kullanıcı henüz seçim yapmadıysa uygulanıyor: `initial*`
   * ile aynı olan bir değer "dokunulmamış" demek. Aynı desen
   * `YearbookExperience` içinde de var. */
  useEffect(() => {
    const now = seasonForDate(new Date());
    setYear((value) => value === initialYear ? now.year : value);
    setSeason((value) => value === initialSeason ? now.season : value);
  }, [initialSeason, initialYear]);

  useEffect(() => {
    const refreshList = () => setEntries(readPersonalList().entries);
    refreshList();
    const unsubscribe = subscribeToPersonalList(refreshList);

    loadBrowserCatalogue(dataVersion)
      .then((items) => { setCatalogue(items); setLoadState("ready"); })
      .catch(() => setLoadState("error"));

    return unsubscribe;
  }, [dataVersion]);

  const years = useMemo(() => availableSeasonYears(catalogue), [catalogue]);
  const boardCounts = useMemo(() => Object.fromEntries(
    views.map((option) => [option.value, seasonBoardItems(catalogue, year, season, option.value).length]),
  ) as Record<SeasonBoardView, number>, [catalogue, season, year]);
  const board = useMemo(() => seasonBoardItems(catalogue, year, season, view), [catalogue, season, view, year]);
  const formats = useMemo(() => [...new Set(board.map((anime) => anime.type))].sort(), [board]);
  const genres = useMemo(() => [...new Set(board.flatMap((anime) => displayTags(anime.tags, 20)))].sort((a, b) => a.localeCompare(b, "tr-TR")), [board]);
  const visible = useMemo(() => board.filter((anime) => {
    if (status !== "ALL" && anime.status !== status) return false;
    if (format !== "ALL" && anime.type !== format) return false;
    if (genre !== "ALL" && !displayTags(anime.tags, 20).includes(genre)) return false;
    if (personalOnly && !["WATCHING", "PLANNED"].includes(entries[anime.id]?.status ?? "")) return false;
    return true;
  }), [board, entries, format, genre, personalOnly, status]);
  const personalCount = board.filter((anime) => ["WATCHING", "PLANNED"].includes(entries[anime.id]?.status ?? "")).length;

  useEffect(() => {
    if (format !== "ALL" && !formats.includes(format)) setFormat("ALL");
    if (genre !== "ALL" && !genres.includes(genre)) setGenre("ALL");
  }, [format, formats, genre, genres]);

  if (loadState === "loading") {
    return <div className="catalogue-loading companion-state"><RotaCompanion scene="listLoading" mood="curious" className="rota-companion--state" /><span></span><p>Sezon yıldızları hizalanıyor…</p></div>;
  }
  if (loadState === "error") {
    return <div className="catalogue-empty companion-state"><RotaCompanion scene="listError" mood="error" className="rota-companion--state" /><span>!</span><h2>Sezon panosu açılamadı.</h2><p>Katalog bağlantısını kontrol edip sayfayı yenile.</p></div>;
  }

  return (
    <>
      <section className="season-board__summary" aria-label="Sezon özeti">
        <div><p>SEÇİLİ DÖNEM</p><h2>{seasonLabels[season]} {year}</h2><small>{boardCounts.SEASON} sezon kaydı · {boardCounts.CONTINUING} devam eden · {boardCounts.UPCOMING} yaklaşan</small></div>
        <div><p>SENİN PLANIN</p><h2>{personalCount}</h2><small>Bu görünümde “İzliyorum” veya “Planlıyorum” rafında olan yapım</small></div>
        <div><p>VERİ NABZI</p><h2>{sourceRelease}</h2><small>Kaynak güncellemesi: {formatSourceDate(sourceLastUpdate)}</small></div>
      </section>

      <section className="season-board__controls" aria-labelledby="season-board-controls-title">
        <header><div><p>SEZON HARİTASI</p><h2 id="season-board-controls-title">Dönemi ve rotanı seç.</h2></div><small>Durumlar katalog anlık görüntüsünü yansıtır; kesin yayın saati veya bölüm bildirimi değildir.</small></header>
        <div className="season-board__period">
          <label>Yıl<select value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
          <div role="group" aria-label="Sezon seç">
            {seasonCodes.map((value) => <button type="button" className={season === value ? "is-active" : ""} aria-pressed={season === value} onClick={() => setSeason(value)} key={value}>{seasonLabels[value]}</button>)}
          </div>
        </div>
        <div className="season-board__views" role="group" aria-label="Sezon görünümü">
          {views.map((option) => <button type="button" className={view === option.value ? "is-active" : ""} aria-pressed={view === option.value} onClick={() => setView(option.value)} key={option.value}><b>{option.label}</b><span>{option.note}</span><strong>{boardCounts[option.value]}</strong></button>)}
        </div>
        <div className="season-board__filters">
          <label>Durum<select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>{statuses.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
          <label>Format<select value={format} onChange={(event) => setFormat(event.target.value)}><option value="ALL">Tüm formatlar</option>{formats.map((value) => <option value={value} key={value}>{typeLabels[value] ?? value}</option>)}</select></label>
          <label>Tür<select value={genre} onChange={(event) => setGenre(event.target.value)}><option value="ALL">Tüm türler</option>{genres.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
          <label className="season-board__personal"><input type="checkbox" checked={personalOnly} onChange={(event) => setPersonalOnly(event.target.checked)} /><span>Yalnız benim planım</span></label>
        </div>
      </section>

      <section className="season-board__results" aria-live="polite">
        <header><div><p>{views.find((option) => option.value === view)?.label.toLocaleUpperCase("tr-TR")}</p><h2>{visible.length} anime bulundu.</h2></div>{personalCount > 0 && <a href="/listem">Kişisel rafımı aç <span>→</span></a>}</header>
        {visible.length ? <div className="season-board__grid">{visible.map((anime) => {
          const entry = entries[anime.id];
          return <div className="season-board-card" key={anime.id}>
            {entry && <span className={`season-board-card__personal is-${entry.status.toLocaleLowerCase("tr-TR")}`}>{personalStatusLabels[entry.status]}</span>}
            <AnimeCard anime={anime} />
          </div>;
        })}</div> : <div className="season-board__empty"><RotaCompanion scene="listFilterEmpty" mood="curious" className="rota-companion--state" /><h2>Bu kesişimde kayıt yok.</h2><p>Sezonu veya filtrelerden birini değiştir; kişisel rafında hiçbir şey değişmedi.</p></div>}
      </section>

      <aside className="season-board__source"><strong>Bu pano neyi biliyor?</strong><p>Rota yalnız izinli statik katalogdaki sezon, yıl ve yayın durumu alanlarını kişisel listenle cihazında eşleştirir. Harici API çağırmaz, yayın sitesi izlemez ve bildirim sözü vermez.</p></aside>
    </>
  );
}
