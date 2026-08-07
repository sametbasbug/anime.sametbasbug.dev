import { useMemo, useState } from "react";
import type { CatalogueAnime } from "../lib/catalogue-ui";
import AnimeCard from "./AnimeCard";

type Props = { items: CatalogueAnime[] };

const filters = [
  { label: "Tümü", value: "ALL" },
  { label: "Devam ediyor", value: "ONGOING" },
  { label: "Tamamlandı", value: "FINISHED" },
  { label: "Yakında", value: "UPCOMING" },
] as const;

export default function SeasonShelf({ items }: Props) {
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("ALL");
  const visible = useMemo(
    () => filter === "ALL" ? items : items.filter((anime) => anime.status === filter),
    [filter, items],
  );

  return (
    <>
      <div className="filter-bar" role="group" aria-label="Sezon animelerini filtrele">
        {filters.map(({ label, value }) => (
          <button
            className={filter === value ? "is-active" : ""}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            key={value}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="anime-grid" aria-live="polite">
        {visible.map((anime) => <AnimeCard anime={anime} key={anime.id} />)}
      </div>
    </>
  );
}
