import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { CatalogueAnime } from "../src/lib/catalogue-ui";
import { calculateRotaStatistics, formatWatchTime, studioLabel } from "../src/lib/personal-statistics";

const catalogue: CatalogueAnime[] = [
  { id: "a", slug: "a", title: "A", type: "TV", episodes: 12, status: "FINISHED", season: { season: "SPRING", year: 2020 }, durationSeconds: 1500, score: null, synonyms: [], studios: ["madhouse inc."], tags: ["action", "drama"], sources: [] },
  { id: "b", slug: "b", title: "B", type: "TV", episodes: 24, status: "FINISHED", season: { season: "FALL", year: 2021 }, durationSeconds: 1200, score: null, synonyms: [], studios: ["bones"], tags: ["action", "comedy"], sources: [] },
  { id: "c", slug: "c", title: "C", type: "MOVIE", episodes: 1, status: "FINISHED", season: { season: "WINTER", year: 2022 }, durationSeconds: 7200, score: null, synonyms: [], studios: ["madhouse inc."], tags: ["fantasy"], sources: [] },
];

const statistics = calculateRotaStatistics([
  { animeId: "a", status: "COMPLETED", progress: 99, score: 9 },
  { animeId: "b", status: "WATCHING", progress: 6, score: 7 },
  { animeId: "c", status: "PLANNED", progress: 0, score: null },
], catalogue);

assert.equal(statistics.totalAnime, 3);
assert.equal(statistics.watchedEpisodes, 18, "İlerleme bilinen bölüm sayısını aşmamalı.");
assert.equal(statistics.watchSeconds, (12 * 1500) + (6 * 1200));
assert.equal(Math.round(statistics.completionRate ?? 0), 50, "Planlanan anime tamamlama paydasına girmemeli.");
assert.equal(statistics.averageScore, 8);
assert.deepEqual(statistics.topGenres[0], { label: "Aksiyon", count: 2 });
assert.deepEqual(statistics.topStudios, [{ label: "Bones", count: 1 }, { label: "Madhouse", count: 1 }]);
assert.equal(formatWatchTime(26 * 60 * 60), "1 gün 2 sa.");
assert.equal(studioLabel("sunrise inc."), "Sunrise");

const migration = await readFile(new URL("../supabase/migrations/202608120004_personal_statistics.sql", import.meta.url), "utf8");
for (const rule of [
  "share_statistics boolean not null default false",
  "grant update (share_statistics) on public.profiles to authenticated",
  "'share_statistics', profile.share_statistics",
  "profile.list_visibility in ('UNLISTED', 'PUBLIC')",
  "entry.deleted_at is null",
]) {
  assert.ok(migration.includes(rule), `İstatistik migration'ında eksik koruma: ${rule}`);
}

console.log("Kişisel Rota istatistikleri ve paylaşım izni doğrulandı.");
