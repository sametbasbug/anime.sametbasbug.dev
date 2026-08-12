import type { CatalogueAnime } from "./catalogue-ui";
import { localizedTag } from "./catalogue-ui";
import type { PersonalStatus } from "./personal-list";

export type StatisticsEntry = {
  animeId: string;
  status: PersonalStatus;
  progress: number;
  score: number | null;
};

export type RankedStatistic = {
  label: string;
  count: number;
};

export type RotaStatistics = {
  totalAnime: number;
  watchedEpisodes: number;
  watchSeconds: number;
  completionRate: number | null;
  averageScore: number | null;
  scoredAnime: number;
  topGenres: RankedStatistic[];
  topStudios: RankedStatistic[];
};

const genreTags = new Set([
  "action", "adventure", "comedy", "crime", "drama", "fantasy", "historical",
  "horror", "isekai", "martial arts", "music", "mystery", "psychological",
  "romance", "school", "science fiction", "scifi", "slice of life", "sports",
  "supernatural", "thriller",
]);

function increment(counts: Map<string, number>, label: string) {
  const normalized = label.trim();
  if (normalized) counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
}

function ranked(counts: Map<string, number>, limit: number): RankedStatistic[] {
  return [...counts.entries()]
    .sort(([aLabel, aCount], [bLabel, bCount]) => bCount - aCount || aLabel.localeCompare(bLabel, "tr"))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export function studioLabel(value: string): string {
  return value
    .replace(/\s+(inc\.?|co\.?\s*,?\s*ltd\.?|ltd\.?)$/iu, "")
    .split(/\s+/u)
    .map((part) => part ? `${part.charAt(0).toLocaleUpperCase("tr-TR")}${part.slice(1)}` : part)
    .join(" ");
}

export function calculateRotaStatistics(
  entries: StatisticsEntry[],
  catalogue: CatalogueAnime[],
): RotaStatistics {
  const byId = new Map(catalogue.map((anime) => [anime.id, anime]));
  const genreCounts = new Map<string, number>();
  const studioCounts = new Map<string, number>();
  let watchedEpisodes = 0;
  let watchSeconds = 0;
  let completed = 0;
  let started = 0;
  let scoreTotal = 0;
  let scoredAnime = 0;

  for (const entry of entries) {
    const anime = byId.get(entry.animeId);
    const progress = Math.max(0, Math.floor(entry.progress));
    const boundedProgress = anime?.episodes && anime.episodes > 0
      ? Math.min(progress, anime.episodes)
      : progress;
    watchedEpisodes += boundedProgress;
    if (anime?.durationSeconds && anime.durationSeconds > 0) {
      watchSeconds += boundedProgress * anime.durationSeconds;
    }

    if (entry.status !== "PLANNED") {
      started += 1;
      if (entry.status === "COMPLETED") completed += 1;
      if (anime) {
        const seenGenres = new Set<string>();
        for (const tag of anime.tags) {
          const normalized = tag.toLocaleLowerCase("en-US");
          if (!genreTags.has(normalized)) continue;
          const label = localizedTag(normalized);
          if (!seenGenres.has(label)) {
            increment(genreCounts, label);
            seenGenres.add(label);
          }
        }

        const seenStudios = new Set<string>();
        for (const studio of anime.studios) {
          const label = studioLabel(studio);
          if (!seenStudios.has(label)) {
            increment(studioCounts, label);
            seenStudios.add(label);
          }
        }
      }
    }

    if (entry.score !== null && Number.isFinite(entry.score)) {
      scoreTotal += entry.score;
      scoredAnime += 1;
    }
  }

  return {
    totalAnime: entries.length,
    watchedEpisodes,
    watchSeconds,
    completionRate: started > 0 ? (completed / started) * 100 : null,
    averageScore: scoredAnime > 0 ? scoreTotal / scoredAnime : null,
    scoredAnime,
    topGenres: ranked(genreCounts, 3),
    topStudios: ranked(studioCounts, 3),
  };
}

export function formatWatchTime(seconds: number): string {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  if (totalMinutes < 60) return `${totalMinutes} dk.`;
  const hours = Math.floor(totalMinutes / 60);
  if (hours < 24) return `${hours} sa.`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days} gün ${remainingHours} sa.` : `${days} gün`;
}
