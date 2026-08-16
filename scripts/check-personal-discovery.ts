import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { CatalogueAnime } from "../src/lib/catalogue-ui";
import { buildGentleReminders, buildPersonalTaste, recommendAnime } from "../src/lib/personal-discovery";
import type { PersonalListEntry } from "../src/lib/personal-list";
import type { WatchJournalEntry } from "../src/lib/watch-journal";

function anime(overrides: Partial<CatalogueAnime> & Pick<CatalogueAnime, "id" | "title">): CatalogueAnime {
  return {
    slug: overrides.id,
    type: "TV",
    episodes: 12,
    status: "FINISHED",
    season: { season: "SPRING", year: 2024 },
    durationSeconds: 1440,
    score: 7.5,
    synonyms: [],
    studios: [],
    tags: [],
    sources: ["source-a", "source-b"],
    ...overrides,
  };
}

function entry(overrides: Partial<PersonalListEntry> & Pick<PersonalListEntry, "animeId" | "status">): PersonalListEntry {
  return { progress: 0, score: null, note: "", updatedAt: "2026-01-01T12:00:00.000Z", ...overrides };
}

const catalogue = [
  anime({ id: "completed", title: "Completed", episodes: 24, score: 8.8, studios: ["madhouse inc."], tags: ["action", "drama"] }),
  anime({ id: "watching", title: "Watching", episodes: 24, score: 8.2, studios: ["madhouse inc."], tags: ["action", "mystery"] }),
  anime({ id: "planned", title: "Planned", score: 7.7, studios: ["madhouse inc."], tags: ["action", "adventure"] }),
  anime({ id: "short", title: "Short", episodes: 8, score: 8.1, studios: ["bones"], tags: ["comedy"] }),
  anime({ id: "movie", title: "Movie", type: "MOVIE", episodes: 1, durationSeconds: 6300, score: 8.5, studios: ["bones"], tags: ["drama", "romance"] }),
  anime({ id: "mystery", title: "Mystery", episodes: 13, score: 8.0, studios: ["madhouse inc."], tags: ["mystery", "psychological"] }),
  anime({ id: "dropped", title: "Dropped", score: 9.9, tags: ["action"] }),
  anime({ id: "upcoming", title: "Upcoming", status: "UPCOMING", score: null, tags: ["action"] }),
];

const entries = [
  entry({ animeId: "completed", status: "COMPLETED", progress: 24, score: 9, updatedAt: "2026-07-15T12:00:00.000Z" }),
  entry({ animeId: "watching", status: "WATCHING", progress: 5, score: 8, updatedAt: "2026-06-01T12:00:00.000Z" }),
  entry({ animeId: "planned", status: "PLANNED", updatedAt: "2026-05-01T12:00:00.000Z" }),
  entry({ animeId: "dropped", status: "DROPPED", progress: 2, score: 3 }),
];

const journal: WatchJournalEntry[] = [
  { id: "journal-1", animeId: "watching", episodeStart: 4, episodeEnd: 5, watchedOn: "2026-06-10", note: "", createdAt: "2026-06-10T12:00:00.000Z", updatedAt: "2026-06-10T12:00:00.000Z" },
];

const profile = buildPersonalTaste(entries, journal, catalogue);
assert.equal(profile.hasHistory, true);
assert.equal(profile.genres[0]?.label, "Aksiyon");
assert.equal(profile.studios[0]?.label, "Madhouse");
assert.equal(profile.formats[0]?.label, "TV serisi");

const personal = recommendAnime(catalogue, entries, journal, "FOR_YOU");
assert.equal(personal[0]?.anime.id, "planned", "Plan rafındaki güçlü eşleşme önce gelmeli.");
assert.equal(personal[0]?.source, "PLANNED");
assert.ok(personal[0]?.reasons.some((reason) => reason.includes("Planladığın rafta")));
for (const excluded of ["completed", "watching", "dropped", "upcoming"]) {
  assert.equal(personal.some(({ anime }) => anime.id === excluded), false, `${excluded} öneri havuzuna girmemeli.`);
}
assert.ok(personal.every(({ reasons }) => reasons.length > 0), "Her öneri açıklanabilir olmalı.");

assert.deepEqual(recommendAnime(catalogue, entries, journal, "MOVIE").map(({ anime }) => anime.id), ["movie"]);
assert.ok(recommendAnime(catalogue, entries, journal, "SHORT").every(({ anime }) => anime.episodes <= 13));
assert.ok(recommendAnime(catalogue, entries, journal, "ONE_SEASON").every(({ anime }) => anime.status === "FINISHED" && anime.episodes >= 6 && anime.episodes <= 26));
assert.ok(recommendAnime(catalogue, entries, journal, "MYSTERY").every(({ anime }) => anime.tags.includes("mystery") || anime.tags.includes("psychological")));

const reminders = buildGentleReminders(catalogue, entries, journal, new Date("2026-08-17T12:00:00.000Z"));
assert.deepEqual(reminders.map(({ anime }) => anime.id), ["planned", "watching"]);
assert.ok(reminders.every(({ message }) => message.includes("zorunda") || message.includes("acelesi yok")), "Hatırlatma dili baskıcı olmamalı.");

const component = await readFile(new URL("../src/components/PersonalDiscoveryExperience.tsx", import.meta.url), "utf8");
for (const rule of [
  "Neden bunu görüyorum?",
  "Harici profil çıkarmaz",
  "açıklamasız “uyum yüzdesi” üretmez",
  "Filtreler kalıcı tercih oluşturmaz",
]) assert.ok(component.includes(rule), `Öneri arayüzünde şeffaflık metni eksik: ${rule}`);

console.log("Açıklanabilir kişisel keşif, seçim yolları ve nazik hatırlatmalar doğrulandı.");
