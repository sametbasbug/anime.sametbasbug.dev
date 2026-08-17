export const PERSONAL_COLLECTIONS_STORAGE_KEY = "rota.personal-collections.v1";
export const PERSONAL_COLLECTIONS_EVENT = "rota:personal-collections-change";

export const COLLECTION_COLORS = {
  lavender: "Lavanta",
  coral: "Mercan",
  mint: "Nane",
  sun: "Güneş",
  sky: "Gökyüzü",
} as const;

export const MAX_COLLECTIONS = 40;
export const MAX_COLLECTION_ITEMS = 200;
export const MAX_COLLECTION_NAME_LENGTH = 60;
export const MAX_COLLECTION_DESCRIPTION_LENGTH = 240;

export type CollectionColor = keyof typeof COLLECTION_COLORS;

export type PersonalCollection = {
  id: string;
  name: string;
  description: string;
  color: CollectionColor;
  animeIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type PersonalCollectionsStore = {
  version: 1;
  collections: Record<string, PersonalCollection>;
  tombstones: Record<string, string>;
};

export type NewPersonalCollection = Pick<PersonalCollection, "name" | "description" | "color">;

const collectionColors = new Set<CollectionColor>(Object.keys(COLLECTION_COLORS) as CollectionColor[]);

export class PersonalCollectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersonalCollectionError";
  }
}

function emptyStore(): PersonalCollectionsStore {
  return { version: 1, collections: {}, tombstones: {} };
}

function validInstant(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function validIdentifier(value: unknown, maxLength = 100): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/gu, " ").slice(0, maxLength) : "";
}

function nextVersion(...versions: Array<string | undefined>) {
  const previousTime = versions.reduce((latest, version) => {
    if (!version) return latest;
    const time = Date.parse(version);
    return Number.isNaN(time) ? latest : Math.max(latest, time);
  }, 0);
  return new Date(Math.max(Date.now(), previousTime + 1)).toISOString();
}

function newCollectionId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const random = new Uint32Array(4);
    globalThis.crypto.getRandomValues(random);
    return `collection-${Array.from(random, (part) => part.toString(16).padStart(8, "0")).join("-")}`;
  }
  return `collection-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function sanitizePersonalCollection(value: unknown): PersonalCollection | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PersonalCollection>;
  if (!validIdentifier(candidate.id)) return null;

  const name = normalizeText(candidate.name, MAX_COLLECTION_NAME_LENGTH);
  if (!name) return null;
  const color = candidate.color && collectionColors.has(candidate.color) ? candidate.color : "lavender";
  const updatedAt = validInstant(candidate.updatedAt) ? candidate.updatedAt : new Date().toISOString();
  const createdAt = validInstant(candidate.createdAt) ? candidate.createdAt : updatedAt;
  const animeIds = Array.isArray(candidate.animeIds)
    ? [...new Set(candidate.animeIds.filter((animeId): animeId is string => validIdentifier(animeId, 300)))].slice(0, MAX_COLLECTION_ITEMS)
    : [];

  return {
    id: candidate.id,
    name,
    description: normalizeText(candidate.description, MAX_COLLECTION_DESCRIPTION_LENGTH),
    color,
    animeIds,
    createdAt,
    updatedAt,
  };
}

export function readPersonalCollections(): PersonalCollectionsStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(PERSONAL_COLLECTIONS_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<PersonalCollectionsStore>;
    const collections: Record<string, PersonalCollection> = {};
    for (const value of Object.values(parsed.collections ?? {})) {
      const collection = sanitizePersonalCollection(value);
      if (collection && Object.keys(collections).length < MAX_COLLECTIONS) collections[collection.id] = collection;
    }

    const tombstones: Record<string, string> = {};
    if (parsed.version === 1 && parsed.tombstones && typeof parsed.tombstones === "object") {
      for (const [id, deletedAt] of Object.entries(parsed.tombstones as Record<string, unknown>)) {
        if (validIdentifier(id) && validInstant(deletedAt)) tombstones[id] = deletedAt;
      }
    }
    return { version: 1, collections, tombstones };
  } catch {
    return emptyStore();
  }
}

export function replacePersonalCollections(store: PersonalCollectionsStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PERSONAL_COLLECTIONS_STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(PERSONAL_COLLECTIONS_EVENT));
}

export function writePersonalCollection(collection: PersonalCollection) {
  if (typeof window === "undefined") return collection;
  const store = readPersonalCollections();
  const previous = store.collections[collection.id];
  const sanitized = sanitizePersonalCollection({
    ...collection,
    createdAt: previous?.createdAt ?? collection.createdAt,
    updatedAt: nextVersion(previous?.updatedAt, store.tombstones[collection.id]),
  });
  if (!sanitized) throw new PersonalCollectionError("Koleksiyon adı boş bırakılamaz.");
  if (!previous && Object.keys(store.collections).length >= MAX_COLLECTIONS) {
    throw new PersonalCollectionError(`En fazla ${MAX_COLLECTIONS} koleksiyon oluşturabilirsin.`);
  }
  store.collections[sanitized.id] = sanitized;
  delete store.tombstones[sanitized.id];
  replacePersonalCollections(store);
  return sanitized;
}

export function createPersonalCollection(input: NewPersonalCollection) {
  const now = new Date().toISOString();
  return writePersonalCollection({ ...input, id: newCollectionId(), animeIds: [], createdAt: now, updatedAt: now });
}

export function removePersonalCollection(id: string) {
  if (typeof window === "undefined") return;
  const store = readPersonalCollections();
  if (!store.collections[id]) return;
  const deletedAt = nextVersion(store.collections[id]?.updatedAt, store.tombstones[id]);
  delete store.collections[id];
  store.tombstones[id] = deletedAt;
  replacePersonalCollections(store);
}

export function setAnimeInCollection(collectionId: string, animeId: string, included: boolean) {
  if (!validIdentifier(animeId, 300)) throw new PersonalCollectionError("Anime kimliği geçerli değil.");
  const collection = readPersonalCollections().collections[collectionId];
  if (!collection) throw new PersonalCollectionError("Koleksiyon bulunamadı.");
  const animeIds = collection.animeIds.filter((id) => id !== animeId);
  if (included) {
    if (animeIds.length >= MAX_COLLECTION_ITEMS) {
      throw new PersonalCollectionError(`Bir koleksiyon en fazla ${MAX_COLLECTION_ITEMS} anime içerebilir.`);
    }
    animeIds.push(animeId);
  }
  return writePersonalCollection({ ...collection, animeIds });
}

export function moveAnimeInCollection(collectionId: string, animeId: string, direction: -1 | 1) {
  const collection = readPersonalCollections().collections[collectionId];
  if (!collection) throw new PersonalCollectionError("Koleksiyon bulunamadı.");
  const animeIds = [...collection.animeIds];
  const index = animeIds.indexOf(animeId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= animeIds.length) return collection;
  [animeIds[index], animeIds[nextIndex]] = [animeIds[nextIndex], animeIds[index]];
  return writePersonalCollection({ ...collection, animeIds });
}

export function subscribeToPersonalCollections(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === PERSONAL_COLLECTIONS_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PERSONAL_COLLECTIONS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PERSONAL_COLLECTIONS_EVENT, callback);
  };
}
