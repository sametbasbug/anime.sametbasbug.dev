import type { PersonalStatus } from "./personal-list";

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
  entries: SharedListEntry[];
};

const shareTokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const shareableStatuses = new Set<PersonalStatus>(["WATCHING", "COMPLETED", "PLANNED", "DROPPED"]);

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

  return {
    display_name: typeof candidate.display_name === "string" && candidate.display_name.trim()
      ? candidate.display_name.trim().slice(0, 50)
      : "Anime yolcusu",
    list_visibility: candidate.list_visibility,
    share_scores: candidate.share_scores === true,
    share_notes: candidate.share_notes === true,
    share_statistics: candidate.share_statistics === true,
    entries,
  };
}
