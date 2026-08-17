import { useEffect, useState } from "react";
import {
  readPersonalCollections,
  setAnimeInCollection,
  subscribeToPersonalCollections,
  type PersonalCollection,
} from "../lib/personal-collections";

type Props = { animeId: string; title: string };

export default function CollectionPicker({ animeId, title }: Props) {
  const [collections, setCollections] = useState<PersonalCollection[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setCollections(Object.values(readPersonalCollections().collections).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setReady(true);
    };
    refresh();
    return subscribeToPersonalCollections(refresh);
  }, []);

  const memberCount = collections.filter((collection) => collection.animeIds.includes(animeId)).length;

  return (
    <div className={`collection-picker${expanded ? " is-expanded" : ""}`}>
      <button type="button" onClick={() => setExpanded((value) => !value)} disabled={!ready} aria-expanded={expanded}>
        <span>{memberCount ? `✦ ${memberCount} koleksiyonda` : "＋ Koleksiyona ekle"}</span><b>{expanded ? "Kapat" : "Seç"}</b>
      </button>
      {expanded && (
        <div className="collection-picker__panel">
          <header><strong>Özel rafların</strong><a href="/koleksiyonlar">Yönet →</a></header>
          {collections.length ? collections.map((collection) => {
            const included = collection.animeIds.includes(animeId);
            return (
              <button
                className={`collection-color--${collection.color}${included ? " is-included" : ""}`}
                type="button"
                role="checkbox"
                aria-checked={included}
                onClick={() => setAnimeInCollection(collection.id, animeId, !included)}
                key={collection.id}
              >
                <i aria-hidden="true">{included ? "✓" : ""}</i><span><strong>{collection.name}</strong><small>{collection.animeIds.length} anime</small></span>
              </button>
            );
          }) : (
            <div className="collection-picker__empty"><p>Henüz özel bir rafın yok.</p><a href="/koleksiyonlar">İlk koleksiyonu oluştur →</a></div>
          )}
          <small>{title}, izleme durumun değişmeden seçtiğin raflarda yer alır.</small>
        </div>
      )}
    </div>
  );
}
