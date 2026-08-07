import { useEffect, useMemo, useState } from "react";
import type { CatalogueAnime } from "../lib/catalogue-ui";
import { seasonLabels, typeLabels, visualFor } from "../lib/catalogue-ui";
import {
  personalStatusLabels,
  readPersonalList,
  subscribeToPersonalList,
  writePersonalEntry,
  type PersonalListEntry,
  type PersonalStatus,
} from "../lib/personal-list";
import AnimeArtwork from "./AnimeArtwork";

type Props = { dataVersion: string };
type ListRecord = { anime: CatalogueAnime; entry: PersonalListEntry };

const filters = [
  { value: "ALL", label: "Tümü" },
  ...Object.entries(personalStatusLabels).map(([value, label]) => ({ value, label })),
] as { value: "ALL" | PersonalStatus; label: string }[];

export default function MyListExperience({ dataVersion }: Props) {
  const [catalogue, setCatalogue] = useState<CatalogueAnime[]>([]);
  const [entries, setEntries] = useState<PersonalListEntry[]>([]);
  const [filter, setFilter] = useState<"ALL" | PersonalStatus>("ALL");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const refreshEntries = () => setEntries(
      Object.values(readPersonalList().entries).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );
    refreshEntries();
    const unsubscribe = subscribeToPersonalList(refreshEntries);

    fetch(`/data/catalogue.json?v=${encodeURIComponent(dataVersion)}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`);
        return response.json() as Promise<CatalogueAnime[]>;
      })
      .then((items) => {
        setCatalogue(items);
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));

    return unsubscribe;
  }, [dataVersion]);

  const records = useMemo(() => {
    const byId = new Map(catalogue.map((anime) => [anime.id, anime]));
    return entries
      .map((entry) => ({ entry, anime: byId.get(entry.animeId) }))
      .filter((record): record is ListRecord => Boolean(record.anime));
  }, [catalogue, entries]);

  const visible = filter === "ALL" ? records : records.filter(({ entry }) => entry.status === filter);
  const counts = Object.fromEntries(
    Object.keys(personalStatusLabels).map((status) => [status, records.filter(({ entry }) => entry.status === status).length]),
  ) as Record<PersonalStatus, number>;

  const update = (record: ListRecord, patch: Partial<PersonalListEntry>) => {
    const next = { ...record.entry, ...patch };
    writePersonalEntry(next);
  };

  const changeStatus = (record: ListRecord, status: PersonalStatus) => {
    const progress = status === "COMPLETED" && record.anime.episodes > 0
      ? record.anime.episodes
      : record.entry.progress;
    update(record, { status, progress });
  };

  const changeProgress = (record: ListRecord, direction: -1 | 1) => {
    const total = record.anime.episodes;
    const progress = Math.max(0, total > 0
      ? Math.min(total, record.entry.progress + direction)
      : record.entry.progress + direction);
    const status = total > 0 && progress >= total
      ? "COMPLETED"
      : progress > 0 && record.entry.status === "PLANNED"
        ? "WATCHING"
        : record.entry.status;
    update(record, { progress, status });
  };

  if (loadState === "loading") {
    return <div className="catalogue-loading"><span></span><p>Kişisel arşivin açılıyor…</p></div>;
  }

  if (loadState === "error") {
    return <div className="catalogue-empty"><span>!</span><h2>Arşiv şu anda açılamadı.</h2><p>Katalog bağlantısını kontrol edip sayfayı yenile.</p></div>;
  }

  if (records.length === 0) {
    return (
      <div className="my-list-empty">
        <span>0 / 900</span>
        <h2>İlk rotanı<br />kaydet.</h2>
        <p>Bir anime detayında “Listeme ekle” düğmesini kullan. Hesapsız yerel kalır; giriş yaptığında cihazlarınla eşitlenir.</p>
        <a href="/ara">Kataloğu keşfet <span>↗</span></a>
      </div>
    );
  }

  return (
    <>
      <div className="list-overview">
        {Object.entries(personalStatusLabels).map(([status, label]) => (
          <button onClick={() => setFilter(status as PersonalStatus)} key={status}>
            <strong>{counts[status as PersonalStatus]}</strong><span>{label}</span>
          </button>
        ))}
      </div>

      <div className="list-filter" role="group" aria-label="Kişisel listeyi filtrele">
        {filters.map(({ value, label }) => (
          <button className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)} aria-pressed={filter === value} key={value}>
            {label} <span>{value === "ALL" ? records.length : counts[value]}</span>
          </button>
        ))}
      </div>

      {visible.length > 0 ? (
        <div className="my-list-grid" aria-live="polite">
          {visible.map((record) => {
            const { anime, entry } = record;
            const visual = visualFor(anime.id);
            const progressPercent = anime.episodes > 0 ? Math.min(100, (entry.progress / anime.episodes) * 100) : 0;
            return (
              <article className="my-list-card" key={anime.id}>
                <a className="my-list-card__art" href={`/anime/${anime.slug}`} aria-label={`${anime.title} detayını aç`}>
                  <AnimeArtwork art={visual.art} palette={visual.palette} compact />
                </a>
                <div className="my-list-card__body">
                  <div className="my-list-card__heading">
                    <div>
                      <p>{typeLabels[anime.type]} · {seasonLabels[anime.season.season]} {anime.season.year}</p>
                      <h2><a href={`/anime/${anime.slug}`}>{anime.title}</a></h2>
                    </div>
                    {entry.score && <strong>★ {entry.score}/10</strong>}
                  </div>

                  <div className="my-list-card__controls">
                    <label>
                      Durum
                      <select value={entry.status} onChange={(event) => changeStatus(record, event.target.value as PersonalStatus)}>
                        {Object.entries(personalStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                      </select>
                    </label>
                    <div className="my-list-card__progress">
                      <span>Bölüm</span>
                      <button onClick={() => changeProgress(record, -1)} aria-label={`${anime.title} ilerlemesini azalt`}>−</button>
                      <b>{entry.progress} / {anime.episodes || "?"}</b>
                      <button onClick={() => changeProgress(record, 1)} aria-label={`${anime.title} ilerlemesini artır`}>+</button>
                    </div>
                  </div>

                  <div className="progress-track" aria-hidden="true"><span style={{ width: `${progressPercent}%` }}></span></div>
                  {entry.note && <p className="my-list-card__note">“{entry.note}”</p>}
                  <a className="my-list-card__edit" href={`/anime/${anime.slug}`}>Puanı ve notu düzenle <span>→</span></a>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="catalogue-empty"><span>0</span><h2>Bu rafta kayıt yok.</h2><p>Başka bir durum filtresi seç.</p></div>
      )}
    </>
  );
}
