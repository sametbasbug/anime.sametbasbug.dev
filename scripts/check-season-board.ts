import assert from "node:assert/strict";
import type { CatalogueAnime } from "../src/lib/catalogue-ui";
import { availableSeasonYears, seasonBoardItems, seasonForDate } from "../src/lib/season-board";

function anime(id: string, year: number, season: string, status: string, title = id): CatalogueAnime {
  return {
    id, slug: id, title, type: "TV", episodes: 12, status,
    season: { season, year }, durationSeconds: 1440, score: 8,
    synonyms: [], studios: [], tags: ["drama"], sources: ["https://example.com"],
  };
}

const catalogue = [
  anime("selected-ongoing", 2026, "SUMMER", "ONGOING"),
  anime("selected-finished", 2026, "SUMMER", "FINISHED"),
  anime("selected-upcoming", 2026, "SUMMER", "UPCOMING"),
  anime("older-ongoing", 2026, "SPRING", "ONGOING"),
  anime("too-old-ongoing", 2025, "WINTER", "ONGOING"),
  anime("fall-upcoming", 2026, "FALL", "UPCOMING"),
  anime("future-upcoming", 2027, "SPRING", "UPCOMING"),
  anime("too-far-upcoming", 2028, "WINTER", "UPCOMING"),
  anime("undefined", 2026, "UNDEFINED", "UPCOMING"),
  anime("duplicate", 2026, "SUMMER", "ONGOING", "selected-ongoing"),
];

assert.deepEqual(seasonForDate(new Date("2026-01-15T12:00:00Z")), { year: 2026, season: "WINTER" });
assert.deepEqual(seasonForDate(new Date("2026-04-15T12:00:00Z")), { year: 2026, season: "SPRING" });
assert.deepEqual(seasonForDate(new Date("2026-08-17T12:00:00Z")), { year: 2026, season: "SUMMER" });
assert.deepEqual(seasonForDate(new Date("2026-11-15T12:00:00Z")), { year: 2026, season: "FALL" });

assert.deepEqual(
  seasonBoardItems(catalogue, 2026, "SUMMER", "SEASON").map((item) => item.id),
  ["selected-ongoing", "selected-upcoming", "selected-finished"],
  "Sezon görünümü yalnız seçili sezonu, durum önceliğiyle ve başlık tekrarını kaldırarak göstermeli.",
);
assert.deepEqual(
  seasonBoardItems(catalogue, 2026, "SUMMER", "CONTINUING").map((item) => item.id),
  ["selected-ongoing", "older-ongoing"],
  "Devam edenler geleceği veya dört sezondan eski kayıtları içermemeli.",
);
assert.deepEqual(
  seasonBoardItems(catalogue, 2026, "SUMMER", "UPCOMING").map((item) => item.id),
  ["selected-upcoming", "fall-upcoming", "future-upcoming"],
  "Yaklaşanlar seçili sezondan başlayarak yalnız beş sezonluk pencereyi kullanmalı.",
);
assert.deepEqual(availableSeasonYears(catalogue), [2028, 2027, 2026, 2025]);

console.log("Season board checks passed.");
