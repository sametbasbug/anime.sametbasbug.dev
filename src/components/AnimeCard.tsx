import { useEffect, useState } from "react";
import type { CatalogueAnime } from "../lib/catalogue-ui";
import { displayTags, preferredAliases, seasonLabels, statusLabels, typeLabels, visualFor } from "../lib/catalogue-ui";
import { createPersonalEntry, readPersonalList, subscribeToPersonalList } from "../lib/personal-list";
import AnimeArtwork from "./AnimeArtwork";

type Props = { anime: CatalogueAnime };

export default function AnimeCard({ anime }: Props) {
  const visual = visualFor(anime.id);
  const alias = preferredAliases(anime.synonyms, 1)[0];
  const tags = displayTags(anime.tags);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const refresh = () => setSaved(Boolean(readPersonalList().entries[anime.id]));
    refresh();
    return subscribeToPersonalList(refresh);
  }, [anime.id]);

  const save = () => {
    if (saved) {
      window.location.href = "/listem";
      return;
    }
    createPersonalEntry(anime.id);
    setSaved(true);
  };

  return (
    <article className="anime-card">
      <button
        className={`anime-card__save ${saved ? "is-saved" : ""}`}
        aria-label={saved ? `${anime.title} kişisel listende; listeyi aç` : `${anime.title} planlananlara ekle`}
        title={saved ? "Listemde" : "Planlananlara ekle"}
        onClick={save}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.8 3.5h10.4c.7 0 1.3.6 1.3 1.3v16l-6.5-4-6.5 4v-16c0-.7.6-1.3 1.3-1.3Z" /></svg>
      </button>
      <a className="anime-card__link" href={`/anime/${anime.slug}`}>
        <AnimeArtwork art={visual.art} palette={visual.palette} posterPath={anime.poster?.path} title={anime.title} />
        <div className="anime-card__body">
          <div className="anime-card__meta">
            <span className="score">{anime.status !== "UPCOMING" && anime.score ? <><span>★</span> {anime.score.toFixed(1)}</> : `${seasonLabels[anime.season.season]} ${anime.season.year}`}</span>
            <span>{statusLabels[anime.status]}</span>
          </div>
          <h3>{anime.title}</h3>
          <p className="native-title">{alias ?? `${typeLabels[anime.type]} · ${seasonLabels[anime.season.season]} ${anime.season.year}`}</p>
          <div className="genre-list">
            {tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </div>
      </a>
    </article>
  );
}
