import type { CatalogueAnime } from "./catalogue-ui";
import { localizedTag } from "./catalogue-ui";
import type { PersonalListEntry } from "./personal-list";
import { isStatisticsGenreTag, studioLabel } from "./personal-statistics";
import type { WatchJournalEntry } from "./watch-journal";

export type YearbookPeriod =
  | { kind: "year"; year: number }
  | { kind: "month"; year: number; month: number };

export type YearbookAnimeHighlight = {
  animeId: string;
  title: string;
  slug: string;
  value: number;
};

export type YearbookRankedLabel = {
  label: string;
  episodes: number;
};

export type YearbookTimelineBucket = {
  key: string;
  label: string;
  episodes: number;
};

export type RotaYearbook = {
  period: YearbookPeriod;
  state: "empty" | "early" | "ready";
  journalEntries: number;
  animeCount: number;
  episodeCount: number;
  watchSeconds: number;
  durationKnownEpisodes: number;
  activeDays: number;
  completedAnime: YearbookAnimeHighlight[];
  topAnime: YearbookAnimeHighlight[];
  topRated: YearbookAnimeHighlight[];
  topGenres: YearbookRankedLabel[];
  topStudios: YearbookRankedLabel[];
  busiestDay: { date: string; episodes: number; animeCount: number } | null;
  longestStreak: number;
  firstDay: string | null;
  lastDay: string | null;
  unmatchedAnimeCount: number;
  timeline: YearbookTimelineBucket[];
};

const monthLabels = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"] as const;
const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"] as const;

function periodBounds(period: YearbookPeriod) {
  if (period.kind === "year") {
    return {
      start: `${period.year}-01-01`,
      end: `${period.year + 1}-01-01`,
    };
  }

  const nextYear = period.month === 12 ? period.year + 1 : period.year;
  const nextMonth = period.month === 12 ? 1 : period.month + 1;
  return {
    start: `${period.year}-${String(period.month).padStart(2, "0")}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}

export function isDateInYearbookPeriod(date: string, period: YearbookPeriod) {
  const { start, end } = periodBounds(period);
  return date >= start && date < end;
}

export function formatYearbookPeriod(period: YearbookPeriod) {
  return period.kind === "year" ? `${period.year}` : `${monthNames[period.month - 1]} ${period.year}`;
}

export function availableYearbookYears(entries: WatchJournalEntry[], currentYear = new Date().getFullYear()) {
  return [...new Set([currentYear, ...entries.map((entry) => Number(entry.watchedOn.slice(0, 4)))])]
    .filter((year) => Number.isInteger(year) && year >= 1900 && year <= 9999)
    .sort((left, right) => right - left);
}

function episodeCount(entry: Pick<WatchJournalEntry, "episodeStart" | "episodeEnd">) {
  return Math.max(0, entry.episodeEnd - entry.episodeStart + 1);
}

function increment(map: Map<string, number>, key: string, amount: number) {
  const normalized = key.trim();
  if (normalized && amount > 0) map.set(normalized, (map.get(normalized) ?? 0) + amount);
}

function rankLabels(counts: Map<string, number>, limit = 3): YearbookRankedLabel[] {
  return [...counts.entries()]
    .sort(([leftLabel, leftCount], [rightLabel, rightCount]) => rightCount - leftCount || leftLabel.localeCompare(rightLabel, "tr-TR"))
    .slice(0, limit)
    .map(([label, episodes]) => ({ label, episodes }));
}

function consecutiveDayDifference(left: string, right: string) {
  const leftTime = Date.parse(`${left}T00:00:00Z`);
  const rightTime = Date.parse(`${right}T00:00:00Z`);
  return Math.round((rightTime - leftTime) / 86_400_000);
}

function longestActiveStreak(dates: string[]) {
  if (dates.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let index = 1; index < dates.length; index += 1) {
    if (consecutiveDayDifference(dates[index - 1], dates[index]) === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

function timelineFor(period: YearbookPeriod, entries: WatchJournalEntry[]): YearbookTimelineBucket[] {
  if (period.kind === "year") {
    return monthLabels.map((label, index) => {
      const month = String(index + 1).padStart(2, "0");
      return {
        key: `${period.year}-${month}`,
        label,
        episodes: entries
          .filter((entry) => entry.watchedOn.startsWith(`${period.year}-${month}-`))
          .reduce((total, entry) => total + episodeCount(entry), 0),
      };
    });
  }

  const weekRanges = [[1, 7], [8, 14], [15, 21], [22, 28], [29, 31]] as const;
  return weekRanges.map(([start, end], index) => ({
    key: `${period.year}-${String(period.month).padStart(2, "0")}-week-${index + 1}`,
    label: `${start}–${end}`,
    episodes: entries
      .filter((entry) => {
        const day = Number(entry.watchedOn.slice(8, 10));
        return day >= start && day <= end;
      })
      .reduce((total, entry) => total + episodeCount(entry), 0),
  }));
}

export function buildRotaYearbook(
  journalEntries: WatchJournalEntry[],
  personalEntries: PersonalListEntry[],
  catalogue: CatalogueAnime[],
  period: YearbookPeriod,
): RotaYearbook {
  const visible = journalEntries.filter((entry) => isDateInYearbookPeriod(entry.watchedOn, period));
  const catalogueById = new Map(catalogue.map((anime) => [anime.id, anime]));
  const personalById = new Map(personalEntries.map((entry) => [entry.animeId, entry]));
  const episodesByAnime = new Map<string, number>();
  const datesByAnime = new Map<string, WatchJournalEntry[]>();
  const episodesByDay = new Map<string, number>();
  const animeByDay = new Map<string, Set<string>>();
  const genreCounts = new Map<string, number>();
  const studioCounts = new Map<string, number>();
  let watchSeconds = 0;
  let durationKnownEpisodes = 0;

  for (const entry of visible) {
    const count = episodeCount(entry);
    const anime = catalogueById.get(entry.animeId);
    increment(episodesByAnime, entry.animeId, count);
    datesByAnime.set(entry.animeId, [...(datesByAnime.get(entry.animeId) ?? []), entry]);
    increment(episodesByDay, entry.watchedOn, count);
    animeByDay.set(entry.watchedOn, new Set([...(animeByDay.get(entry.watchedOn) ?? []), entry.animeId]));

    if (!anime) continue;
    if (anime.durationSeconds && anime.durationSeconds > 0) {
      watchSeconds += count * anime.durationSeconds;
      durationKnownEpisodes += count;
    }

    for (const tag of new Set(anime.tags)) {
      if (isStatisticsGenreTag(tag)) increment(genreCounts, localizedTag(tag.toLocaleLowerCase("en-US")), count);
    }
    for (const studio of new Set(anime.studios.map(studioLabel))) increment(studioCounts, studio, count);
  }

  const activeDates = [...episodesByDay.keys()].sort();
  const rankedAnime = [...episodesByAnime.entries()]
    .flatMap(([animeId, value]) => {
      const anime = catalogueById.get(animeId);
      return anime ? [{ animeId, title: anime.title, slug: anime.slug, value }] : [];
    })
    .sort((left, right) => right.value - left.value || left.title.localeCompare(right.title, "tr-TR"));

  const completedAnime = [...datesByAnime.entries()]
    .flatMap(([animeId, entries]) => {
      const anime = catalogueById.get(animeId);
      const personal = personalById.get(animeId);
      if (!anime || !anime.episodes || anime.episodes < 1 || personal?.status !== "COMPLETED") return [];
      const finalEntry = entries
        .filter((entry) => entry.episodeEnd >= anime.episodes)
        .sort((left, right) => left.watchedOn.localeCompare(right.watchedOn))[0];
      return finalEntry ? [{ animeId, title: anime.title, slug: anime.slug, value: anime.episodes }] : [];
    })
    .sort((left, right) => left.title.localeCompare(right.title, "tr-TR"));

  const topRated = rankedAnime
    .flatMap((highlight) => {
      const score = personalById.get(highlight.animeId)?.score;
      return score === null || score === undefined ? [] : [{ ...highlight, value: score, watchedEpisodes: highlight.value }];
    })
    .sort((left, right) => right.value - left.value || right.watchedEpisodes - left.watchedEpisodes || left.title.localeCompare(right.title, "tr-TR"))
    .slice(0, 3)
    .map(({ watchedEpisodes: _watchedEpisodes, ...highlight }) => highlight);

  const busiestDay = [...episodesByDay.entries()]
    .map(([date, episodes]) => ({ date, episodes, animeCount: animeByDay.get(date)?.size ?? 0 }))
    .sort((left, right) => right.episodes - left.episodes || left.date.localeCompare(right.date))[0] ?? null;
  const unmatchedAnimeCount = [...episodesByAnime.keys()].filter((animeId) => !catalogueById.has(animeId)).length;
  const totalEpisodes = visible.reduce((total, entry) => total + episodeCount(entry), 0);
  const animeCount = episodesByAnime.size;
  const activeDays = activeDates.length;

  return {
    period,
    state: visible.length === 0 ? "empty" : activeDays < 2 || animeCount < 2 ? "early" : "ready",
    journalEntries: visible.length,
    animeCount,
    episodeCount: totalEpisodes,
    watchSeconds,
    durationKnownEpisodes,
    activeDays,
    completedAnime,
    topAnime: rankedAnime.slice(0, 3),
    topRated,
    topGenres: rankLabels(genreCounts),
    topStudios: rankLabels(studioCounts),
    busiestDay,
    longestStreak: longestActiveStreak(activeDates),
    firstDay: activeDates[0] ?? null,
    lastDay: activeDates.at(-1) ?? null,
    unmatchedAnimeCount,
    timeline: timelineFor(period, visible),
  };
}

export type YearbookShareCardData = {
  periodLabel: string;
  episodeCount: number;
  animeCount: number;
  activeDays: number;
  completedCount: number;
  watchTimeLabel: string;
  highlights?: string[];
};

function escapeXml(value: string) {
  return value.replace(/[<>&"']/gu, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "\"": "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

function compactHighlight(value: string) {
  const normalized = value.trim().replace(/\s+/gu, " ");
  return normalized.length > 42 ? `${normalized.slice(0, 39)}…` : normalized;
}

export function renderYearbookCardSvg(data: YearbookShareCardData) {
  const highlights = (data.highlights ?? []).map(compactHighlight).filter(Boolean).slice(0, 3);
  const highlightMarkup = highlights.length > 0
    ? `<text x="72" y="490" class="kicker">DÖNEMİN ANİMELERİ</text>${highlights.map((title, index) => `<text x="72" y="${526 + index * 31}" class="highlight">${index + 1}. ${escapeXml(title)}</text>`).join("")}`
    : `<text x="72" y="510" class="quiet">Anime adları bu kartta gizli tutuldu.</text><text x="72" y="542" class="quiet">Yalnız toplu günlük sayıları paylaşılıyor.</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(data.periodLabel)} Equinox Rota özeti">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff9f4"/><stop offset=".52" stop-color="#f4ebff"/><stop offset="1" stop-color="#ffe8ee"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="8" dy="9" stdDeviation="0" flood-color="#342b4a"/></filter>
  </defs>
  <style>
    text{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#342b4a}.brand{font-size:22px;font-weight:900;letter-spacing:2px}.period{font-size:70px;font-weight:900;letter-spacing:-4px}.subtitle,.quiet{font-size:20px;fill:#746b84}.kicker{font-size:15px;font-weight:900;letter-spacing:2px;fill:#7657bd}.number{font-size:46px;font-weight:900}.label{font-size:14px;font-weight:800;letter-spacing:1px;fill:#746b84}.highlight{font-size:22px;font-weight:750}
  </style>
  <rect width="1200" height="630" fill="url(#paper)"/>
  <circle cx="1100" cy="84" r="150" fill="#ffe875" opacity=".65"/><circle cx="1032" cy="585" r="205" fill="#9ee4c8" opacity=".3"/>
  <path d="M1038 88 1060 20l45 49h18l43-49 23 68" fill="#a88bea" stroke="#342b4a" stroke-width="8" stroke-linejoin="round"/>
  <rect x="1025" y="77" width="176" height="142" rx="70" fill="#a88bea" stroke="#342b4a" stroke-width="8"/>
  <ellipse cx="1078" cy="135" rx="9" ry="13" fill="#342b4a"/><ellipse cx="1147" cy="135" rx="9" ry="13" fill="#342b4a"/>
  <path d="m1098 167 15 10 15-10" fill="none" stroke="#342b4a" stroke-width="7" stroke-linecap="round"/>
  <path d="m994 42 10 24 24 10-24 10-10 24-10-24-24-10 24-10z" fill="#ff7f91" stroke="#342b4a" stroke-width="5"/>
  <text x="72" y="72" class="brand">ROTA BY EQUINOX ✦</text>
  <text x="72" y="158" class="period">${escapeXml(data.periodLabel)}</text>
  <text x="72" y="198" class="subtitle">Anime yolculuğumun günlükten gelen özeti</text>
  <g transform="translate(72 246)" filter="url(#shadow)">
    <rect width="205" height="150" rx="24" fill="#fff" stroke="#342b4a" stroke-width="3"/><text x="24" y="68" class="number">${data.episodeCount}</text><text x="24" y="108" class="label">İZLENEN BÖLÜM</text>
  </g>
  <g transform="translate(300 246)" filter="url(#shadow)">
    <rect width="205" height="150" rx="24" fill="#fff" stroke="#342b4a" stroke-width="3"/><text x="24" y="68" class="number">${data.animeCount}</text><text x="24" y="108" class="label">ANİME</text>
  </g>
  <g transform="translate(528 246)" filter="url(#shadow)">
    <rect width="205" height="150" rx="24" fill="#fff" stroke="#342b4a" stroke-width="3"/><text x="24" y="68" class="number">${data.activeDays}</text><text x="24" y="108" class="label">AKTİF GÜN</text>
  </g>
  <g transform="translate(756 246)" filter="url(#shadow)">
    <rect width="300" height="150" rx="24" fill="#fff" stroke="#342b4a" stroke-width="3"/><text x="24" y="66" class="number">${escapeXml(data.watchTimeLabel)}</text><text x="24" y="108" class="label">YAKLAŞIK SÜRE · ${data.completedCount} FİNAL</text>
  </g>
  ${highlightMarkup}
  <text x="1128" y="594" text-anchor="end" class="quiet">Notlar ve hesap bilgileri karta eklenmez.</text>
</svg>`;
}
