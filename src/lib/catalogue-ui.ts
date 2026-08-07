export type CatalogueAnime = {
  id: string;
  slug: string;
  title: string;
  type: string;
  episodes: number;
  status: string;
  season: { season: string; year: number };
  durationSeconds: number | null;
  score: number | null;
  synonyms: string[];
  studios: string[];
  tags: string[];
  sources: string[];
};

export const statusLabels: Record<string, string> = {
  FINISHED: "Tamamlandı",
  ONGOING: "Devam ediyor",
  UPCOMING: "Yakında",
};

export const typeLabels: Record<string, string> = {
  TV: "TV serisi",
  MOVIE: "Film",
  OVA: "OVA",
  ONA: "ONA",
  SPECIAL: "Özel bölüm",
};

export const seasonLabels: Record<string, string> = {
  WINTER: "Kış",
  SPRING: "İlkbahar",
  SUMMER: "Yaz",
  FALL: "Sonbahar",
  UNDEFINED: "Belirsiz",
};

export const tagLabels: Record<string, string> = {
  "3d cg animation": "3B CGI animasyon",
  action: "Aksiyon",
  "action comedy": "Aksiyon komedisi",
  "action drama": "Aksiyon draması",
  adoption: "Evlat edinme",
  "adult cast": "Yetişkin karakterler",
  adventure: "Macera",
  "age gap": "Yaş farkı",
  aliens: "Uzaylılar",
  amnesia: "Hafıza kaybı",
  animals: "Hayvanlar",
  "anti-hero": "Anti-kahraman",
  anthropomorphism: "Antropomorfizm",
  "artificial intelligence": "Yapay zekâ",
  assassins: "Suikastçılar",
  "based on a light novel": "Light novel uyarlaması",
  "based on a manga": "Manga uyarlaması",
  "battle of wits": "Zekâ savaşı",
  bullying: "Zorbalık",
  "calling your attacks": "İsimli saldırılar",
  "character driven": "Karakter odaklı",
  "chinese animation": "Çin animasyonu",
  "coming of age": "Büyüme hikâyesi",
  "coming-of-age": "Büyüme hikâyesi",
  comedy: "Komedi",
  conspiracy: "Komplo",
  "contemporary fantasy": "Modern fantastik",
  crime: "Suç",
  "cute girls doing cute things": "Gündelik kız grubu",
  "daily life": "Gündelik yaşam",
  "dark fantasy": "Karanlık fantastik",
  death: "Ölüm",
  demon: "İblisler",
  demons: "İblisler",
  detective: "Dedektiflik",
  dragons: "Ejderhalar",
  drama: "Dram",
  ecchi: "Ecchi",
  "ensemble cast": "Kalabalık karakter kadrosu",
  episodic: "Bölümlük anlatı",
  "family life": "Aile yaşamı",
  fantasy: "Fantastik",
  "female protagonist": "Kadın başrol",
  food: "Yemek",
  "found family": "Seçilmiş aile",
  gore: "Yoğun şiddet",
  guns: "Ateşli silahlar",
  harem: "Harem",
  "high school": "Lise",
  romance: "Romantik",
  historical: "Tarihî",
  idol: "İdol",
  isekai: "Başka dünyaya geçiş",
  iyashikei: "Huzurlu yaşam",
  magic: "Büyü",
  "male protagonist": "Erkek başrol",
  "martial arts": "Dövüş sanatları",
  mystery: "Gizem",
  school: "Okul",
  sequel: "Devam yapımı",
  "short episodes": "Kısa bölümler",
  "slice of life": "Gündelik yaşam",
  psychological: "Psikolojik",
  supernatural: "Doğaüstü",
  thriller: "Gerilim",
  "science fiction": "Bilim kurgu",
  scifi: "Bilim kurgu",
  sports: "Spor",
  music: "Müzik",
  horror: "Korku",
};

const tagPriority = [
  "action", "adventure", "comedy", "drama", "fantasy", "romance", "mystery",
  "psychological", "thriller", "horror", "supernatural", "science fiction", "scifi",
  "sports", "music", "slice of life", "historical", "crime", "martial arts", "isekai",
  "magic", "school", "dark fantasy", "contemporary fantasy", "action comedy", "action drama",
];

export function localizedTag(tag: string) {
  return tagLabels[tag.toLocaleLowerCase("en-US")] ?? tag;
}

export function displayTags(tags: string[], limit = 2) {
  return [...tags]
    .filter((tag) => tag.toLocaleLowerCase("en-US") in tagLabels)
    .sort((a, b) => {
      const aRank = tagPriority.indexOf(a.toLocaleLowerCase("en-US"));
      const bRank = tagPriority.indexOf(b.toLocaleLowerCase("en-US"));
      return (aRank < 0 ? 999 : aRank) - (bRank < 0 ? 999 : bRank);
    })
    .map(localizedTag)
    .filter((tag, index, all) => all.indexOf(tag) === index)
    .slice(0, limit);
}

const aliasScore = (value: string) => /[çğıöşüÇĞİÖŞÜ]/.test(value)
  ? 3
  : /[\u3040-\u30ff\u3400-\u9fff]/.test(value)
    ? 2
    : 1;

export function preferredAliases(synonyms: string[], limit = 3) {
  return [...synonyms]
    .sort((a, b) => aliasScore(b) - aliasScore(a) || a.length - b.length)
    .slice(0, limit);
}

export function durationLabel(seconds: number | null) {
  if (!seconds) return "Belirsiz";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} dk.`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} sa. ${remainder} dk.` : `${hours} sa.`;
}

export function sourceLabel(url: string) {
  if (url.includes("myanimelist.net")) return "MyAnimeList";
  if (url.includes("anidb.net")) return "AniDB";
  if (url.includes("anime-planet.com")) return "Anime-Planet";
  if (url.includes("animenewsnetwork.com")) return "Anime News Network";
  if (url.includes("kitsu.app")) return "Kitsu";
  if (url.includes("livechart.me")) return "LiveChart";
  if (url.includes("anisearch.com")) return "AniSearch";
  if (url.includes("simkl.com")) return "Simkl";
  if (url.includes("anilist.co")) return "AniList";
  return new URL(url).hostname.replace("www.", "");
}

const artworks = ["moon", "blade", "city", "signal", "garden", "ember"] as const;
const palettes = ["violet", "coral", "blue", "lime", "rose", "amber"] as const;

export function visualFor(id: string) {
  const numeric = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    art: artworks[numeric % artworks.length],
    palette: palettes[(numeric * 3 + 1) % palettes.length],
  };
}
