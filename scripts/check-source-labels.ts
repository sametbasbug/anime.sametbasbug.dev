import assert from "node:assert/strict";
import { sourceLabel } from "../src/lib/catalogue-ui";

assert.equal(sourceLabel("https://myanimelist.net/anime/1"), "MyAnimeList");
assert.equal(sourceLabel("https://www.myanimelist.net/anime/1"), "MyAnimeList");
assert.equal(sourceLabel("https://subdomain.anilist.co/anime/1"), "AniList");

assert.equal(
  sourceLabel("https://myanimelist.net.example.com/anime/1"),
  "myanimelist.net.example.com",
);
assert.equal(
  sourceLabel("https://evil-myanimelist.net/anime/1"),
  "evil-myanimelist.net",
);

console.log("Kaynak alan adı etiketleme kontrolleri geçti.");
