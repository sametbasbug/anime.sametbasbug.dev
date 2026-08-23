import type { CatalogueAnime } from "./catalogue-ui.ts";
import { localizedTag, sourceSignal, typeLabels } from "./catalogue-ui.ts";
import type { PersonalListEntry } from "./personal-list.ts";
import { studioLabel } from "./personal-statistics.ts";
import type { WatchJournalEntry } from "./watch-journal.ts";

export const discoveryPaths = {
  FOR_YOU: { label: "Sana göre", note: "Rafındaki ortak izlerden" },
  SHORT: { label: "Kısa bir şey", note: "13 bölüm veya kısa bölüm" },
  MOVIE: { label: "Film", note: "Tek oturumluk hikâye" },
  ONE_SEASON: { label: "Tek sezon", note: "Tamamlanmış, 6–26 bölüm" },
  CALM: { label: "Sakin", note: "Yumuşak ve gündelik" },
  ENERGY: { label: "Enerjik", note: "Aksiyon ve tempo" },
  EMOTIONAL: { label: "Duygusal", note: "Karakter ve bağlar" },
  MYSTERY: { label: "Gizemli", note: "Merak ve zihin oyunu" },
} as const;

export type DiscoveryPath = keyof typeof discoveryPaths;
export type RecommendationSource = "PLANNED" | "CATALOGUE";

export type TasteSignal = {
  label: string;
  weight: number;
};

export type PersonalTasteProfile = {
  hasHistory: boolean;
  genres: TasteSignal[];
  studios: TasteSignal[];
  formats: TasteSignal[];
};

export type PersonalRecommendation = {
  anime: CatalogueAnime;
  score: number;
  reasons: string[];
  source: RecommendationSource;
};

export type GentleReminder = {
  anime: CatalogueAnime;
  entry: PersonalListEntry;
  daysWaiting: number;
  message: string;
};

const genreTags = new Set([
  "action", "adventure", "comedy", "crime", "drama", "fantasy", "historical",
  "horror", "isekai", "martial arts", "music", "mystery", "psychological",
  "romance", "school", "science fiction", "sci-fi", "scifi", "slice of life",
  "sports", "supernatural", "thriller",
]);

const moodTags: Record<Extract<DiscoveryPath, "CALM" | "ENERGY" | "EMOTIONAL" | "MYSTERY">, Set<string>> = {
  CALM: new Set(["iyashikei", "slice of life", "daily life", "comedy", "food", "family life"]),
  ENERGY: new Set(["action", "adventure", "sports", "martial arts", "battle of wits"]),
  EMOTIONAL: new Set(["drama", "romance", "coming of age", "coming-of-age", "found family", "family life"]),
  MYSTERY: new Set(["mystery", "psychological", "thriller", "detective", "conspiracy", "crime"]),
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

function increment(weights: Map<string, number>, key: string, amount: number) {
  const normalized = normalize(key);
  if (normalized) weights.set(normalized, (weights.get(normalized) ?? 0) + amount);
}

function ranked(weights: Map<string, number>, label: (key: string) => string, limit = 4): TasteSignal[] {
  return [...weights.entries()]
    .filter(([, weight]) => weight > 0)
    .sort(([leftKey, leftWeight], [rightKey, rightWeight]) => rightWeight - leftWeight || leftKey.localeCompare(rightKey, "tr"))
    .slice(0, limit)
    .map(([key, weight]) => ({ label: label(key), weight }));
}

function entryAffinity(entry: PersonalListEntry, journalCount: number) {
  const statusWeight = entry.status === "COMPLETED" ? 3 : entry.status === "WATCHING" ? 2 : 0;
  const scoreWeight = entry.score === null ? 0 : entry.score - 6;
  return statusWeight + scoreWeight + Math.min(2, journalCount * 0.35);
}

export function buildPersonalTaste(
  entries: PersonalListEntry[],
  journal: WatchJournalEntry[],
  catalogue: CatalogueAnime[],
): PersonalTasteProfile {
  const byId = new Map(catalogue.map((anime) => [anime.id, anime]));
  const journalCounts = new Map<string, number>();
  journal.forEach((item) => journalCounts.set(item.animeId, (journalCounts.get(item.animeId) ?? 0) + 1));
  const genres = new Map<string, number>();
  const studios = new Map<string, number>();
  const formats = new Map<string, number>();
  let hasHistory = false;

  for (const entry of entries) {
    if (entry.status === "PLANNED" || entry.status === "DROPPED") continue;
    const anime = byId.get(entry.animeId);
    if (!anime) continue;
    const affinity = entryAffinity(entry, journalCounts.get(entry.animeId) ?? 0);
    if (affinity <= 0) continue;
    hasHistory = true;

    const seenGenres = new Set<string>();
    for (const tag of anime.tags) {
      const key = normalize(tag);
      if (!genreTags.has(key) || seenGenres.has(key)) continue;
      increment(genres, key, affinity);
      seenGenres.add(key);
    }
    new Set(anime.studios.map(normalize)).forEach((studio) => increment(studios, studio, affinity));
    increment(formats, anime.type, affinity);
  }

  return {
    hasHistory,
    genres: ranked(genres, localizedTag),
    studios: ranked(studios, studioLabel, 3),
    formats: ranked(formats, (type) => typeLabels[type.toLocaleUpperCase("en-US")] ?? type, 3),
  };
}

function matchesPath(anime: CatalogueAnime, path: DiscoveryPath) {
  const tags = new Set(anime.tags.map(normalize));
  if (path === "SHORT") {
    return tags.has("short episodes")
      || Boolean(anime.durationSeconds && anime.durationSeconds <= 15 * 60)
      || (anime.type !== "MOVIE" && anime.status === "FINISHED" && anime.episodes > 0 && anime.episodes <= 13);
  }
  if (path === "MOVIE") return anime.type === "MOVIE";
  if (path === "ONE_SEASON") {
    return ["TV", "ONA"].includes(anime.type)
      && anime.status === "FINISHED"
      && anime.episodes >= 6
      && anime.episodes <= 26
      && !tags.has("sequel");
  }
  if (path in moodTags) return [...moodTags[path as keyof typeof moodTags]].some((tag) => tags.has(tag));
  return true;
}

function pathReason(anime: CatalogueAnime, path: DiscoveryPath) {
  const tags = new Set(anime.tags.map(normalize));
  if (path === "SHORT") {
    if (tags.has("short episodes") || Boolean(anime.durationSeconds && anime.durationSeconds <= 15 * 60)) return "Bölümleri kısa; küçük bir zaman aralığına sığıyor.";
    return `${anime.episodes} bölümlük tamamlanmış bir rota.`;
  }
  if (path === "MOVIE") return "Tek oturumda tamamlanabilecek bir film.";
  if (path === "ONE_SEASON") return `${anime.episodes} bölümlük tamamlanmış tek sezon adayı.`;
  if (path in moodTags) {
    const match = anime.tags.map(normalize).find((tag) => moodTags[path as keyof typeof moodTags].has(tag));
    if (match) return `${localizedTag(match)} izi seçtiğin ruh hâliyle eşleşiyor.`;
  }
  return null;
}

function bestGenreMatch(anime: CatalogueAnime, profile: PersonalTasteProfile) {
  const signals = new Map(profile.genres.map((item) => [normalize(item.label), item]));
  return anime.tags
    .map((tag) => ({ tag, signal: signals.get(normalize(localizedTag(tag))) }))
    .filter((item): item is { tag: string; signal: TasteSignal } => Boolean(item.signal))
    .sort((left, right) => right.signal.weight - left.signal.weight)[0] ?? null;
}

function bestStudioMatch(anime: CatalogueAnime, profile: PersonalTasteProfile) {
  const signals = new Map(profile.studios.map((item) => [normalize(item.label), item]));
  return anime.studios
    .map((studio) => ({ studio, signal: signals.get(normalize(studioLabel(studio))) }))
    .filter((item): item is { studio: string; signal: TasteSignal } => Boolean(item.signal))
    .sort((left, right) => right.signal.weight - left.signal.weight)[0] ?? null;
}

export function recommendAnime(
  catalogue: CatalogueAnime[],
  entries: PersonalListEntry[],
  journal: WatchJournalEntry[],
  path: DiscoveryPath = "FOR_YOU",
  limit = 18,
): PersonalRecommendation[] {
  const profile = buildPersonalTaste(entries, journal, catalogue);
  const listById = new Map(entries.map((entry) => [entry.animeId, entry]));
  const formatWeights = new Map(profile.formats.map((item) => [normalize(item.label), item.weight]));

  return catalogue
    .filter((anime) => anime.status !== "UPCOMING" && matchesPath(anime, path))
    .filter((anime) => !["COMPLETED", "DROPPED", "WATCHING"].includes(listById.get(anime.id)?.status ?? ""))
    .map((anime): PersonalRecommendation => {
      const entry = listById.get(anime.id);
      const source: RecommendationSource = entry?.status === "PLANNED" ? "PLANNED" : "CATALOGUE";
      const genre = bestGenreMatch(anime, profile);
      const studio = bestStudioMatch(anime, profile);
      const formatLabel = typeLabels[anime.type] ?? anime.type;
      const formatWeight = formatWeights.get(normalize(formatLabel)) ?? 0;
      const pathMatch = pathReason(anime, path);
      const quality = anime.score ? Math.max(0, anime.score - 6) : 0;
      let score = quality * 1.5 + Math.min(sourceSignal(anime), 8) * 0.08;
      const reasons: string[] = [];

      if (source === "PLANNED") {
        score += path === "FOR_YOU" ? 7 : 4;
        reasons.push("Planladığın rafta zaten seni bekliyor.");
      }
      if (genre) {
        score += Math.min(8, genre.signal.weight * 0.7);
        reasons.push(`${localizedTag(genre.tag)} izi, sevdiğin yapımlarda sık karşıma çıktı.`);
      }
      if (studio) {
        score += Math.min(5, studio.signal.weight * 0.45);
        reasons.push(`${studioLabel(studio.studio)}, arşivindeki güçlü stüdyo izlerinden biri.`);
      }
      if (formatWeight > 0) {
        score += Math.min(3, formatWeight * 0.25);
        reasons.push(`${formatLabel} formatı izleme geçmişinle uyuşuyor.`);
      }
      if (pathMatch) reasons.unshift(pathMatch);
      if (!profile.hasHistory) reasons.push("Arşivin henüz küçük; seçim katalog puanı ve veri kapsamıyla başladı.");
      if (reasons.length === 0 && anime.score) reasons.push(`Katalog puanı ${anime.score.toFixed(1)}; kişisel izlerin büyüdükçe gerekçe de keskinleşecek.`);
      if (anime.tags.map(normalize).includes("sequel") && source === "CATALOGUE") score -= 2;

      return { anime, score, reasons: reasons.slice(0, 3), source };
    })
    .sort((left, right) => right.score - left.score || (right.anime.score ?? 0) - (left.anime.score ?? 0) || left.anime.title.localeCompare(right.anime.title, "tr"))
    .slice(0, limit);
}

function daysSince(value: string, now: Date) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return 0;
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 86_400_000));
}

export function buildGentleReminders(
  catalogue: CatalogueAnime[],
  entries: PersonalListEntry[],
  journal: WatchJournalEntry[],
  now = new Date(),
  limit = 3,
): GentleReminder[] {
  const byId = new Map(catalogue.map((anime) => [anime.id, anime]));
  const latestJournal = new Map<string, string>();
  for (const item of journal) {
    const timestamp = `${item.watchedOn}T12:00:00`;
    if (!latestJournal.has(item.animeId) || timestamp > (latestJournal.get(item.animeId) ?? "")) latestJournal.set(item.animeId, timestamp);
  }

  return entries
    .filter((entry) => entry.status === "WATCHING" || entry.status === "PLANNED")
    .map((entry) => {
      const anime = byId.get(entry.animeId);
      const activity = latestJournal.get(entry.animeId) ?? entry.updatedAt;
      return anime ? { anime, entry, daysWaiting: daysSince(activity, now) } : null;
    })
    .filter((item): item is { anime: CatalogueAnime; entry: PersonalListEntry; daysWaiting: number } => Boolean(item))
    .filter(({ entry, daysWaiting }) => daysWaiting >= (entry.status === "WATCHING" ? 21 : 45))
    .sort((left, right) => right.daysWaiting - left.daysWaiting)
    .slice(0, limit)
    .map((item) => ({
      ...item,
      message: item.entry.status === "WATCHING"
        ? `${item.daysWaiting} gündür ara vermişsin. Devam etmek zorunda değilsin; kaldığın ${item.entry.progress}. bölüm burada.`
        : `${item.daysWaiting} gündür planladıklarında. Bu akşamlık seçime katabilirsin, acelesi yok.`,
    }));
}
