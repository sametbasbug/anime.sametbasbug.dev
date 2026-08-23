import { sourceSignal, type CatalogueAnime } from "./catalogue-ui";

export const seasonCodes = ["WINTER", "SPRING", "SUMMER", "FALL"] as const;
export type SeasonCode = (typeof seasonCodes)[number];
export type SeasonBoardView = "SEASON" | "CONTINUING" | "UPCOMING";

const seasonRanks = new Map<SeasonCode, number>(seasonCodes.map((season, index) => [season, index]));

export function isSeasonCode(value: string): value is SeasonCode {
  return seasonRanks.has(value as SeasonCode);
}

export function seasonForDate(date = new Date()): { year: number; season: SeasonCode } {
  const month = date.getMonth();
  return {
    year: date.getFullYear(),
    season: month < 3 ? "WINTER" : month < 6 ? "SPRING" : month < 9 ? "SUMMER" : "FALL",
  };
}

export function seasonIndex(year: number, season: SeasonCode) {
  return year * seasonCodes.length + (seasonRanks.get(season) ?? 0);
}

function qualityScore(anime: CatalogueAnime) {
  return (anime.poster ? 18 : 0) + sourceSignal(anime) * 2 + (anime.score ?? 0);
}

function uniqueByTitle(items: CatalogueAnime[]) {
  const seen = new Set<string>();
  return items.filter((anime) => {
    const key = anime.title.normalize("NFKC").trim().toLocaleLowerCase("tr-TR");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function seasonBoardItems(
  catalogue: CatalogueAnime[],
  year: number,
  season: SeasonCode,
  view: SeasonBoardView,
) {
  const selectedIndex = seasonIndex(year, season);
  const candidates = catalogue.filter((anime) => {
    if (!isSeasonCode(anime.season.season)) return false;
    const animeIndex = seasonIndex(anime.season.year, anime.season.season);

    if (view === "SEASON") return animeIndex === selectedIndex;
    if (view === "CONTINUING") {
      return anime.status === "ONGOING" && animeIndex <= selectedIndex && selectedIndex - animeIndex <= 4;
    }
    return anime.status === "UPCOMING" && animeIndex >= selectedIndex && animeIndex - selectedIndex <= 5;
  });

  const statusRank: Record<string, number> = { ONGOING: 0, UPCOMING: 1, FINISHED: 2 };
  candidates.sort((a, b) => {
    const aIndex = seasonIndex(a.season.year, a.season.season as SeasonCode);
    const bIndex = seasonIndex(b.season.year, b.season.season as SeasonCode);
    if (view === "UPCOMING" && aIndex !== bIndex) return aIndex - bIndex;
    if (view === "CONTINUING" && aIndex !== bIndex) return bIndex - aIndex;
    if (view === "SEASON" && a.status !== b.status) return (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
    return qualityScore(b) - qualityScore(a) || a.title.localeCompare(b.title, "tr-TR");
  });

  return uniqueByTitle(candidates);
}

export function availableSeasonYears(catalogue: CatalogueAnime[]) {
  return [...new Set(catalogue
    .filter((anime) => isSeasonCode(anime.season.season))
    .map((anime) => anime.season.year)
    .filter((year) => Number.isInteger(year) && year > 1900))]
    .sort((a, b) => b - a);
}
