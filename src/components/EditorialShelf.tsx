import { useEffect, useState } from "react";
import type { CatalogueAnime } from "../lib/catalogue-ui";
import { editorialCollectionIndex } from "../lib/editorial-rotation";
import AnimeCard from "./AnimeCard";

export type EditorialShelfCollection = {
  id: string;
  label: string;
  title: string;
  description: string;
  items: CatalogueAnime[];
};

type Props = {
  collections: EditorialShelfCollection[];
  initialIndex: number;
};

export default function EditorialShelf({ collections, initialIndex }: Props) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    setActiveIndex(editorialCollectionIndex(new Date(), collections.length));
  }, [collections.length]);

  if (!collections.length) return null;
  const active = collections[activeIndex] ?? collections[0];

  return (
    <section className="editorial-rotation" aria-labelledby="editorial-rotation-title">
      <div className="editorial-rotation__heading">
        <div>
          <p className="eyebrow">ROTA EDİTÖRLÜĞÜ · HAFTALIK SEÇKİ</p>
          <span className="editorial-rotation__label">{active.label}</span>
          <h2 id="editorial-rotation-title">{active.title}</h2>
          <p>{active.description}</p>
        </div>
        <div className="editorial-rotation__actions">
          <a href="/rehberler">Tüm rehberler ↗</a>
          <div className="editorial-rotation__controls" role="group" aria-label="Editoryal seçkiyi değiştir">
            {collections.map((collection, index) => (
              <button
                type="button"
                className={index === activeIndex ? "is-active" : ""}
                aria-label={`${index + 1}. seçki: ${collection.title}`}
                aria-pressed={index === activeIndex}
                onClick={() => setActiveIndex(index)}
                key={collection.id}
              >
                {String(index + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="anime-grid editorial-rotation__grid" aria-live="polite">
        {active.items.map((anime) => <AnimeCard anime={anime} key={anime.id} />)}
      </div>
    </section>
  );
}
