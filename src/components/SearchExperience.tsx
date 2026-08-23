import { useEffect, useMemo, useState } from "react";
import type { CatalogueAnime } from "../lib/catalogue-ui";
import { loadBrowserCatalogue } from "../lib/catalogue-loader";
import { displayTags, localizedTag, seasonLabels, statusLabels, typeLabels, visualFor } from "../lib/catalogue-ui";
import AnimeArtwork from "./AnimeArtwork";

type Props = { dataVersion: string };

const fold = (value: string) => value
  .toLocaleLowerCase("tr-TR")
  .replaceAll("ı", "i")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "");

type SearchableAnime = {
  anime: CatalogueAnime;
  foldedTitle: string;
  foldedSynonyms: string[];
  haystack: string;
};

function relevance({ anime, foldedTitle, foldedSynonyms }: SearchableAnime, query: string) {
  if (!query) {
    const releasedBonus = anime.status === "FINISHED" ? 12 : anime.status === "ONGOING" ? 10 : -6;
    const currentBonus = anime.season.year >= 2024 && anime.season.year <= 2026 ? 2 : 0;
    const score = anime.status === "UPCOMING" ? 0 : (anime.score ?? 0);
    const popularity = anime.popularityRank ? Math.max(0, 12 - Math.log10(anime.popularityRank + 1) * 3) : 0;
    return score + releasedBonus + currentBonus + popularity;
  }
  if (foldedTitle === query) return 100;
  if (foldedTitle.startsWith(query)) return 80;
  if (foldedTitle.includes(query)) return 60;
  if (foldedSynonyms.some((item) => item === query)) return 55;
  if (foldedSynonyms.some((item) => item.includes(query))) return 45;
  const statusBonus = anime.status === "FINISHED" ? 10 : anime.status === "ONGOING" ? 8 : -8;
  const score = anime.status === "UPCOMING" ? 0 : (anime.score ?? 0);
  const popularity = anime.popularityRank ? Math.max(0, 8 - Math.log10(anime.popularityRank + 1) * 2) : 0;
  return 10 + score + statusBonus + popularity;
}

export default function SearchExperience({ dataVersion }: Props) {
  const [items, setItems] = useState<CatalogueAnime[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [genre, setGenre] = useState("ALL");
  const [sort, setSort] = useState("RELEVANCE");
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    const incoming = new URLSearchParams(window.location.search).get("q");
    const incomingType = new URLSearchParams(window.location.search).get("type");
    const incomingStatus = new URLSearchParams(window.location.search).get("status");
    if (incoming) setQuery(incoming);
    if (incomingType && incomingType in typeLabels) setType(incomingType);
    if (incomingStatus && incomingStatus in statusLabels) setStatus(incomingStatus);
    loadBrowserCatalogue(dataVersion)
      .then((data) => {
        setItems(data);
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, [dataVersion]);

  useEffect(() => setVisibleCount(24), [query, type, status, genre, sort]);

  const genreOptions = useMemo(() => Array.from(new Set(
    items.flatMap((anime) => displayTags(anime.tags, 8)),
  )).sort((a, b) => a.localeCompare(b, "tr-TR")), [items]);

  const searchIndex = useMemo<SearchableAnime[]>(() => items.map((anime) => {
    const foldedTitle = fold(anime.title);
    const foldedSynonyms = anime.synonyms.map(fold);
    return {
      anime,
      foldedTitle,
      foldedSynonyms,
      haystack: fold([
        anime.title,
        ...anime.synonyms,
        ...anime.studios,
        ...anime.tags,
        ...anime.tags.map(localizedTag),
        String(anime.season.year),
      ].join(" ")),
    };
  }), [items]);

  const results = useMemo(() => {
    const normalizedQuery = fold(query.trim());
    return searchIndex
      .filter(({ anime, haystack }) => {
        if (type !== "ALL" && anime.type !== type) return false;
        if (status !== "ALL" && anime.status !== status) return false;
        if (genre !== "ALL" && !displayTags(anime.tags, 10).includes(genre)) return false;
        return !normalizedQuery || haystack.includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (sort === "SCORE") return (b.anime.score ?? 0) - (a.anime.score ?? 0);
        if (sort === "NEWEST") return b.anime.season.year - a.anime.season.year || (b.anime.score ?? 0) - (a.anime.score ?? 0);
        if (sort === "OLDEST") return a.anime.season.year - b.anime.season.year || (b.anime.score ?? 0) - (a.anime.score ?? 0);
        return relevance(b, normalizedQuery) - relevance(a, normalizedQuery);
      })
      .map(({ anime }) => anime);
  }, [searchIndex, query, type, status, genre, sort]);

  const visible = results.slice(0, visibleCount);

  return (
    <div className="catalogue-experience">
      <div className="catalogue-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.4 4.4" /></svg>
        <input
          name="catalogue-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Anime adı, stüdyo veya tür ara…"
          aria-label="Katalogda ara"
        />
        {query && <button onClick={() => setQuery("")} aria-label="Aramayı temizle">Temizle</button>}
      </div>

      <div className="catalogue-toolbar">
        <p><strong>{results.length}</strong> yapım bulundu</p>
        <div className="catalogue-selects">
          <label>Tür
            <select name="catalogue-genre" value={genre} onChange={(event) => setGenre(event.target.value)}>
              <option value="ALL">Tümü</option>
              {genreOptions.map((label) => <option value={label} key={label}>{label}</option>)}
            </select>
          </label>
          <label>Format
            <select name="catalogue-type" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="ALL">Tümü</option>
              {Object.entries(typeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>Durum
            <select name="catalogue-status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">Tümü</option>
              {Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>Sırala
            <select name="catalogue-sort" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="RELEVANCE">Önerilen</option>
              <option value="SCORE">Puana göre</option>
              <option value="NEWEST">En yeni</option>
              <option value="OLDEST">En eski</option>
            </select>
          </label>
        </div>
      </div>

      {loadState === "loading" ? (
        <div className="catalogue-loading" aria-live="polite"><span></span><p>Katalog açılıyor…</p></div>
      ) : loadState === "error" ? (
        <div className="catalogue-empty"><span>!</span><h2>Katalog şu anda açılamadı.</h2><p>Bağlantıyı kontrol edip sayfayı yenile.</p></div>
      ) : visible.length > 0 ? (
        <div className="catalogue-grid" aria-live="polite">
          {visible.map((anime) => {
            const visual = visualFor(anime.id);
            return (
              <a className="catalogue-card" href={`/anime/${anime.slug}`} key={anime.slug}>
                <AnimeArtwork art={visual.art} palette={visual.palette} poster={anime.poster} title={anime.title} />
                <div className="catalogue-card__body">
                  <div className="catalogue-card__kicker">
                    <span>{seasonLabels[anime.season.season]} {anime.season.year}</span>
                    {anime.status !== "UPCOMING" && anime.score && <strong>★ {anime.score.toFixed(1)}</strong>}
                  </div>
                  <h2>{anime.title}</h2>
                  <p>{typeLabels[anime.type]} · {anime.episodes || "?"} bölüm · {statusLabels[anime.status]}</p>
                  <div>{displayTags(anime.tags).map((tag) => <span key={tag}>{tag}</span>)}</div>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="catalogue-empty">
          <span>404</span>
          <h2>Bu rotada bir şey yok.</h2>
          <p>Yazımı sadeleştir veya filtrelerden birini kaldır.</p>
        </div>
      )}

      {visibleCount < results.length && (
        <button className="load-more" onClick={() => setVisibleCount((count) => count + 24)}>
          Daha fazla göster <span>+24</span>
        </button>
      )}
    </div>
  );
}
