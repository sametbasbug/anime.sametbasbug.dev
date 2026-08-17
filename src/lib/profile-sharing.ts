import type { PersonalStatus } from "./personal-list";
import { COLLECTION_COLORS, MAX_COLLECTIONS, MAX_COLLECTION_DESCRIPTION_LENGTH, MAX_COLLECTION_ITEMS, MAX_COLLECTION_NAME_LENGTH, type CollectionColor } from "./personal-collections";

export type SharedListEntry = {
  anime_id: string;
  status: PersonalStatus;
  progress: number;
  score: number | null;
  note: string | null;
};

export type SharedProfile = {
  display_name: string;
  list_visibility: "UNLISTED" | "PUBLIC";
  share_scores: boolean;
  share_notes: boolean;
  share_statistics: boolean;
  share_collections: boolean;
  entries: SharedListEntry[];
  collections: SharedCollection[];
};

export type SharedCollection = {
  id: string;
  name: string;
  description: string;
  color: CollectionColor;
  anime_ids: string[];
};

const shareTokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const shareableStatuses = new Set<PersonalStatus>(["WATCHING", "COMPLETED", "PLANNED", "DROPPED"]);
const collectionColors = new Set<CollectionColor>(Object.keys(COLLECTION_COLORS) as CollectionColor[]);

export function isShareToken(value: string): boolean {
  return shareTokenPattern.test(value.trim());
}

export function buildShareUrl(origin: string, token: string): string {
  const url = new URL("/paylas", origin);
  url.searchParams.set("rota", token);
  return url.toString();
}

export function normalizeSharedProfile(value: unknown): SharedProfile | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SharedProfile>;
  if (candidate.list_visibility !== "UNLISTED" && candidate.list_visibility !== "PUBLIC") return null;

  const entries = Array.isArray(candidate.entries)
    ? candidate.entries.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const row = entry as Partial<SharedListEntry>;
        if (typeof row.anime_id !== "string" || !row.anime_id) return [];
        if (!row.status || !shareableStatuses.has(row.status)) return [];
        const progress = Number(row.progress);
        const score = row.score === null ? null : Number(row.score);
        return [{
          anime_id: row.anime_id,
          status: row.status,
          progress: Number.isFinite(progress) ? Math.max(0, Math.floor(progress)) : 0,
          score: score !== null && Number.isFinite(score) && score >= 1 && score <= 10 ? Math.round(score) : null,
          note: typeof row.note === "string" ? row.note.slice(0, 600) : null,
        }];
      })
    : [];
  const shareCollections = candidate.share_collections === true;
  const collections = shareCollections && Array.isArray(candidate.collections)
    ? candidate.collections.flatMap((value) => {
        if (!value || typeof value !== "object") return [];
        const collection = value as Partial<SharedCollection>;
        if (typeof collection.id !== "string" || !collection.id || collection.id.length > 100) return [];
        if (typeof collection.name !== "string" || !collection.name.trim()) return [];
        if (!collection.color || !collectionColors.has(collection.color)) return [];
        const animeIds = Array.isArray(collection.anime_ids)
          ? [...new Set(collection.anime_ids.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 300))].slice(0, MAX_COLLECTION_ITEMS)
          : [];
        return [{
          id: collection.id,
          name: collection.name.trim().slice(0, MAX_COLLECTION_NAME_LENGTH),
          description: typeof collection.description === "string" ? collection.description.trim().slice(0, MAX_COLLECTION_DESCRIPTION_LENGTH) : "",
          color: collection.color,
          anime_ids: animeIds,
        }];
      }).slice(0, MAX_COLLECTIONS)
    : [];

  return {
    display_name: typeof candidate.display_name === "string" && candidate.display_name.trim()
      ? candidate.display_name.trim().slice(0, 50)
      : "Anime yolcusu",
    list_visibility: candidate.list_visibility,
    share_scores: candidate.share_scores === true,
    share_notes: candidate.share_notes === true,
    share_statistics: candidate.share_statistics === true,
    share_collections: shareCollections,
    entries,
    collections,
  };
}
