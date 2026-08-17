import { useEffect, useMemo, useState } from "react";
import type { CatalogueAnime } from "../lib/catalogue-ui";
import { seasonLabels, typeLabels, visualFor } from "../lib/catalogue-ui";
import {
  COLLECTION_COLORS,
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_NAME_LENGTH,
  createPersonalCollection,
  moveAnimeInCollection,
  readPersonalCollections,
  removePersonalCollection,
  setAnimeInCollection,
  subscribeToPersonalCollections,
  writePersonalCollection,
  type CollectionColor,
  type PersonalCollection,
} from "../lib/personal-collections";
import AnimeArtwork from "./AnimeArtwork";
import RotaCompanion from "./RotaCompanion";

type Props = { dataVersion: string };

function sortedCollections() {
  return Object.values(readPersonalCollections().collections).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export default function CollectionsExperience({ dataVersion }: Props) {
  const [collections, setCollections] = useState<PersonalCollection[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueAnime[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState<CollectionColor>("lavender");
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftColor, setDraftColor] = useState<CollectionColor>("lavender");
  const [query, setQuery] = useState("");
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const refresh = () => setCollections(sortedCollections());
    refresh();
    const hashId = decodeURIComponent(window.location.hash.slice(1));
    if (hashId) setActiveId(hashId);
    const unsubscribe = subscribeToPersonalCollections(refresh);
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

  useEffect(() => {
    if (!collections.length) {
      setActiveId("");
      return;
    }
    if (!collections.some((collection) => collection.id === activeId)) setActiveId(collections[0].id);
  }, [activeId, collections]);

  const active = collections.find((collection) => collection.id === activeId) ?? null;
  useEffect(() => {
    if (!active) return;
    setDraftName(active.name);
    setDraftDescription(active.description);
    setDraftColor(active.color);
    setDeleteArmed(false);
    setQuery("");
  }, [active?.id]);

  const byId = useMemo(() => new Map(catalogue.map((anime) => [anime.id, anime])), [catalogue]);
  const members = active
    ? active.animeIds.map((animeId) => byId.get(animeId)).filter((anime): anime is CatalogueAnime => Boolean(anime))
    : [];
  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
  const searchResults = normalizedQuery.length < 2 || !active
    ? []
    : catalogue
        .filter((anime) => !active.animeIds.includes(anime.id))
        .filter((anime) => [anime.title, ...anime.synonyms].some((value) => value.toLocaleLowerCase("tr-TR").includes(normalizedQuery)))
        .slice(0, 8);

  const choose = (id: string) => {
    setActiveId(id);
    window.history.replaceState(null, "", `${window.location.pathname}#${encodeURIComponent(id)}`);
  };

  const create = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const collection = createPersonalCollection({ name: newName, description: newDescription, color: newColor });
      setNewName("");
      setNewDescription("");
      setFeedback("Koleksiyon oluşturuldu.");
      choose(collection.id);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Koleksiyon oluşturulamadı.");
    }
  };

  const save = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!active) return;
    try {
      writePersonalCollection({ ...active, name: draftName, description: draftDescription, color: draftColor });
      setFeedback("Koleksiyon bilgileri kaydedildi.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Koleksiyon kaydedilemedi.");
    }
  };

  const add = (animeId: string) => {
    if (!active) return;
    try {
      setAnimeInCollection(active.id, animeId, true);
      setFeedback("Anime koleksiyona eklendi.");
      setQuery("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Anime eklenemedi.");
    }
  };

  const removeAnime = (animeId: string) => {
    if (!active) return;
    setAnimeInCollection(active.id, animeId, false);
    setFeedback("Anime koleksiyondan çıkarıldı.");
  };

  const removeCollection = () => {
    if (!active) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    removePersonalCollection(active.id);
    window.history.replaceState(null, "", window.location.pathname);
    setFeedback("Koleksiyon silindi; silme kaydı bu cihazda korundu.");
  };

  return (
    <div className="collections-workspace">
      <aside className="collections-sidebar">
        <div className="collections-sidebar__heading">
          <p className="eyebrow">ÖZEL RAFLAR</p>
          <h2>Koleksiyonlarım</h2>
          <span>{collections.length}</span>
        </div>

        {collections.length > 0 && (
          <nav className="collection-tabs" aria-label="Kişisel koleksiyonlar">
            {collections.map((collection) => (
              <button
                className={`collection-tab collection-color--${collection.color}${collection.id === activeId ? " is-active" : ""}`}
                onClick={() => choose(collection.id)}
                aria-pressed={collection.id === activeId}
                key={collection.id}
              >
                <i aria-hidden="true"></i>
                <span><strong>{collection.name}</strong><small>{collection.animeIds.length} anime</small></span>
                <b>→</b>
              </button>
            ))}
          </nav>
        )}

        <form className="collection-create" onSubmit={create}>
          <p className="eyebrow">YENİ KOLEKSİYON</p>
          <label>
            Ad
            <input value={newName} maxLength={MAX_COLLECTION_NAME_LENGTH} placeholder="Örn. Gece rotaları" onChange={(event) => setNewName(event.target.value)} required />
          </label>
          <label>
            Kısa açıklama
            <textarea value={newDescription} maxLength={MAX_COLLECTION_DESCRIPTION_LENGTH} rows={3} placeholder="Bu rafta neyi biriktiriyorsun?" onChange={(event) => setNewDescription(event.target.value)} />
          </label>
          <fieldset className="collection-colors">
            <legend>Renk</legend>
            {Object.entries(COLLECTION_COLORS).map(([color, label]) => (
              <label className={`collection-color--${color}`} title={label} key={color}>
                <input type="radio" name="new-collection-color" value={color} checked={newColor === color} onChange={() => setNewColor(color as CollectionColor)} />
                <span aria-hidden="true"></span><b>{label}</b>
              </label>
            ))}
          </fieldset>
          <button className="collection-primary" type="submit">Koleksiyon oluştur <span>＋</span></button>
        </form>
      </aside>

      <section className="collection-stage" aria-live="polite">
        {loadState === "loading" && <div className="collection-state"><RotaCompanion scene="listLoading" mood="curious" /><p>Koleksiyon rafları hazırlanıyor…</p></div>}
        {loadState === "error" && <div className="collection-state"><RotaCompanion scene="listError" mood="error" /><h2>Katalog açılamadı.</h2><p>Sayfayı yenileyip tekrar dene.</p></div>}
        {loadState === "ready" && !active && (
          <div className="collection-state collection-state--empty">
            <RotaCompanion scene="listEmpty" mood="happy" />
            <span>01</span><h2>İlk özel rafını kur.</h2>
            <p>Favoriler, rahatlatanlar veya bir gün paylaşmak istediklerin… Bu raflar izleme durumundan bağımsızdır.</p>
          </div>
        )}
        {loadState === "ready" && active && (
          <>
            <header className={`collection-stage__hero collection-color--${active.color}`} id={active.id}>
              <div><p className="eyebrow">KİŞİSEL KOLEKSİYON · YALNIZ BU CİHAZDA</p><h2>{active.name}</h2><p>{active.description || "Bu koleksiyonun hikâyesini henüz yazmadın."}</p></div>
              <strong>{active.animeIds.length.toString().padStart(2, "0")}</strong>
            </header>

            <form className="collection-settings" onSubmit={save}>
              <label>Ad<input value={draftName} maxLength={MAX_COLLECTION_NAME_LENGTH} onChange={(event) => setDraftName(event.target.value)} required /></label>
              <label>Açıklama<input value={draftDescription} maxLength={MAX_COLLECTION_DESCRIPTION_LENGTH} onChange={(event) => setDraftDescription(event.target.value)} /></label>
              <label>Renk<select value={draftColor} onChange={(event) => setDraftColor(event.target.value as CollectionColor)}>{Object.entries(COLLECTION_COLORS).map(([color, label]) => <option value={color} key={color}>{label}</option>)}</select></label>
              <button type="submit">Bilgileri kaydet</button>
              <button className={deleteArmed ? "is-armed" : ""} type="button" onClick={removeCollection}>{deleteArmed ? "Silme işlemini onayla" : "Koleksiyonu sil"}</button>
            </form>

            <section className="collection-search">
              <div><p className="eyebrow">YENİ BİR DURAK EKLE</p><h3>Katalogda ara</h3></div>
              <label><span>⌕</span><input type="search" value={query} placeholder="Anime adı yaz…" onChange={(event) => setQuery(event.target.value)} /></label>
              {normalizedQuery.length >= 2 && (
                <div className="collection-search__results">
                  {searchResults.length ? searchResults.map((anime) => (
                    <button type="button" onClick={() => add(anime.id)} key={anime.id}>
                      <span><strong>{anime.title}</strong><small>{typeLabels[anime.type]} · {seasonLabels[anime.season.season]} {anime.season.year}</small></span><b>＋</b>
                    </button>
                  )) : <p>Bu aramayla eklenebilecek başka anime bulunamadı.</p>}
                </div>
              )}
            </section>

            {members.length ? (
              <div className="collection-grid">
                {members.map((anime, index) => {
                  const visual = visualFor(anime.id);
                  return (
                    <article className="collection-anime" key={anime.id}>
                      <a href={`/anime/${anime.slug}`} className="collection-anime__art"><AnimeArtwork art={visual.art} palette={visual.palette} posterPath={anime.poster?.path} title={anime.title} compact /></a>
                      <div>
                        <p>{typeLabels[anime.type]} · {seasonLabels[anime.season.season]} {anime.season.year}</p>
                        <h3><a href={`/anime/${anime.slug}`}>{anime.title}</a></h3>
                        <footer>
                          <div>
                            <button type="button" onClick={() => moveAnimeInCollection(active.id, anime.id, -1)} disabled={index === 0} aria-label={`${anime.title} yapımını öne taşı`}>↑</button>
                            <button type="button" onClick={() => moveAnimeInCollection(active.id, anime.id, 1)} disabled={index === members.length - 1} aria-label={`${anime.title} yapımını geriye taşı`}>↓</button>
                          </div>
                          <button type="button" onClick={() => removeAnime(anime.id)}>Raftan çıkar</button>
                        </footer>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : <div className="collection-empty-shelf"><span>✦</span><h3>Bu raf henüz boş.</h3><p>Yukarıdaki aramayla ilk animeyi ekle.</p></div>}
          </>
        )}
        {feedback && <p className="collection-feedback" role="status">{feedback}</p>}
      </section>
    </div>
  );
}
