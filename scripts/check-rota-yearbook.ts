import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { CatalogueAnime } from "../src/lib/catalogue-ui";
import type { PersonalListEntry } from "../src/lib/personal-list";
import {
  availableYearbookYears,
  buildRotaYearbook,
  formatYearbookPeriod,
  isDateInYearbookPeriod,
  renderYearbookCardSvg,
} from "../src/lib/rota-yearbook";
import type { WatchJournalEntry } from "../src/lib/watch-journal";

function anime(overrides: Partial<CatalogueAnime> & Pick<CatalogueAnime, "id" | "title">): CatalogueAnime {
  return {
    slug: overrides.id,
    type: "TV",
    episodes: 12,
    status: "FINISHED",
    season: { season: "WINTER", year: 2026 },
    durationSeconds: 1_500,
    score: 8,
    synonyms: [],
    studios: ["madhouse inc."],
    tags: ["action", "drama"],
    sources: [],
    ...overrides,
  };
}

function journal(id: string, animeId: string, episodeStart: number, episodeEnd: number, watchedOn: string): WatchJournalEntry {
  return { id, animeId, episodeStart, episodeEnd, watchedOn, note: "Özel günlük notu", createdAt: `${watchedOn}T10:00:00.000Z`, updatedAt: `${watchedOn}T10:00:00.000Z` };
}

function personal(animeId: string, status: PersonalListEntry["status"], score: number | null): PersonalListEntry {
  return { animeId, status, progress: 12, score, note: "Özel arşiv notu", updatedAt: "2026-02-01T10:00:00.000Z" };
}

const catalogue = [
  anime({ id: "a", title: "A & <B>" }),
  anime({ id: "b", title: "B", episodes: 24, durationSeconds: 1_200, studios: ["bones"], tags: ["action", "mystery"] }),
  anime({ id: "c", title: "C", type: "MOVIE", episodes: 1, durationSeconds: 7_200, studios: ["studio colorido"], tags: ["fantasy"] }),
];
const journalEntries = [
  journal("1", "a", 1, 2, "2026-01-01"),
  journal("2", "a", 3, 4, "2026-01-02"),
  journal("3", "a", 12, 12, "2026-01-03"),
  journal("4", "b", 1, 3, "2026-01-03"),
  journal("5", "missing", 1, 1, "2026-01-04"),
  journal("6", "c", 1, 1, "2026-02-01"),
];
const personalEntries = [personal("a", "COMPLETED", 9), personal("b", "WATCHING", 8), personal("c", "COMPLETED", 10)];

assert.equal(formatYearbookPeriod({ kind: "year", year: 2026 }), "2026");
assert.equal(formatYearbookPeriod({ kind: "month", year: 2026, month: 1 }), "Ocak 2026");
assert.equal(isDateInYearbookPeriod("2026-01-31", { kind: "month", year: 2026, month: 1 }), true);
assert.equal(isDateInYearbookPeriod("2026-02-01", { kind: "month", year: 2026, month: 1 }), false, "Ay sonu bir sonraki aya taşmamalı.");
assert.deepEqual(availableYearbookYears(journalEntries, 2025), [2026, 2025]);

const january = buildRotaYearbook(journalEntries, personalEntries, catalogue, { kind: "month", year: 2026, month: 1 });
assert.equal(january.state, "ready");
assert.equal(january.journalEntries, 5);
assert.equal(january.episodeCount, 9);
assert.equal(january.animeCount, 3, "Katalogdan düşen günlük başlığı toplu anime sayısında korunmalı.");
assert.equal(january.activeDays, 4);
assert.equal(january.watchSeconds, (5 * 1_500) + (3 * 1_200));
assert.equal(january.durationKnownEpisodes, 8);
assert.equal(january.unmatchedAnimeCount, 1);
assert.equal(january.longestStreak, 4);
assert.deepEqual(january.busiestDay, { date: "2026-01-03", episodes: 4, animeCount: 2 });
assert.deepEqual(january.completedAnime.map((item) => item.animeId), ["a"], "Final yalnız günlük kanıtı ve güncel Tamamladım durumu birlikte varsa sayılmalı.");
assert.deepEqual(january.topAnime.map((item) => [item.animeId, item.value]), [["a", 5], ["b", 3]]);
assert.deepEqual(january.topRated.map((item) => [item.animeId, item.value]), [["a", 9], ["b", 8]]);
assert.deepEqual(january.topGenres[0], { label: "Aksiyon", episodes: 8 });
assert.deepEqual(january.topStudios.map((item) => item.label), ["Madhouse", "Bones"]);
assert.equal(january.timeline.length, 5);
assert.equal(january.timeline[0].episodes, 9);

const yearly = buildRotaYearbook(journalEntries, personalEntries, catalogue, { kind: "year", year: 2026 });
assert.equal(yearly.episodeCount, 10);
assert.equal(yearly.timeline.length, 12);
assert.equal(yearly.timeline[0].episodes, 9);
assert.equal(yearly.timeline[1].episodes, 1);
assert.deepEqual(yearly.completedAnime.map((item) => item.animeId), ["a", "c"]);

const early = buildRotaYearbook([journal("early", "a", 1, 1, "2026-03-01")], personalEntries, catalogue, { kind: "month", year: 2026, month: 3 });
assert.equal(early.state, "early", "Tek günlük/tek animelik veri eğilim gibi sunulmamalı.");
const empty = buildRotaYearbook(journalEntries, personalEntries, catalogue, { kind: "year", year: 2025 });
assert.equal(empty.state, "empty");
assert.equal(empty.longestStreak, 0);

const privateCard = renderYearbookCardSvg({ periodLabel: "Ocak 2026", episodeCount: 9, animeCount: 3, activeDays: 4, completedCount: 1, watchTimeLabel: "3 sa." });
assert.ok(privateCard.includes("Anime adları bu kartta gizli tutuldu."));
assert.ok(!privateCard.includes("A &"));
assert.ok(!privateCard.includes("Özel günlük notu"));
assert.ok(!privateCard.includes("Özel arşiv notu"));
const titledCard = renderYearbookCardSvg({ periodLabel: "Ocak 2026", episodeCount: 9, animeCount: 3, activeDays: 4, completedCount: 1, watchTimeLabel: "3 sa.", highlights: ["A & <B>"] });
assert.ok(titledCard.includes("A &amp; &lt;B&gt;"), "Karta açıkça eklenen başlık XML olarak kaçırılmalı.");
assert.ok(!titledCard.includes("<B>"));

const component = await readFile(new URL("../src/components/YearbookExperience.tsx", import.meta.url), "utf8");
for (const guard of [
  "useState(false)",
  "Kişisel notlar, hesap kimliği ve senkronizasyon verileri hiçbir zaman karta girmez.",
  "geçmişteki durum değişiklikleri tahmin edilmez",
  "includeTitles ? summary.topAnime",
]) assert.ok(component.includes(guard), `Yıllık arayüzünde eksik gizlilik/doğruluk koruması: ${guard}`);

const header = await readFile(new URL("../src/components/SiteHeader.astro", import.meta.url), "utf8");
assert.ok(header.includes('href: "/yillik"'), "Rota yıllığı tüm bölümler menüsünde görünmeli.");

console.log("Rota yıllığı dönem, tutarlılık, erken dönem ve paylaşım gizliliği kontrolleri geçti.");
