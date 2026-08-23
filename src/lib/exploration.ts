import { catalogue, type CatalogueAnime } from "./catalogue";

export type GenreDefinition = {
  slug: string;
  label: string;
  tags: string[];
};

export const genres: GenreDefinition[] = [
  { slug: "aksiyon", label: "Aksiyon", tags: ["action"] },
  { slug: "macera", label: "Macera", tags: ["adventure"] },
  { slug: "komedi", label: "Komedi", tags: ["comedy"] },
  { slug: "dram", label: "Dram", tags: ["drama"] },
  { slug: "fantastik", label: "Fantastik", tags: ["fantasy"] },
  { slug: "romantik", label: "Romantik", tags: ["romance"] },
  { slug: "gizem", label: "Gizem", tags: ["mystery"] },
  { slug: "psikolojik", label: "Psikolojik", tags: ["psychological"] },
  { slug: "gerilim", label: "Gerilim", tags: ["thriller"] },
  { slug: "korku", label: "Korku", tags: ["horror"] },
  { slug: "dogaustu", label: "Doğaüstü", tags: ["supernatural"] },
  { slug: "bilim-kurgu", label: "Bilim kurgu", tags: ["science fiction", "scifi"] },
  { slug: "spor", label: "Spor", tags: ["sports"] },
  { slug: "muzik", label: "Müzik", tags: ["music"] },
  { slug: "tarihi", label: "Tarihî", tags: ["historical"] },
  { slug: "suc", label: "Suç", tags: ["crime"] },
  { slug: "isekai", label: "İsekai", tags: ["isekai"] },
  { slug: "gundelik-yasam", label: "Gündelik yaşam", tags: ["slice of life", "daily life"] },
  { slug: "dovus-sanatlari", label: "Dövüş sanatları", tags: ["martial arts"] },
  { slug: "okul", label: "Okul", tags: ["school", "high school"] },
];

const fold = (value: string) => value
  .toLocaleLowerCase("tr-TR")
  .replaceAll("ı", "i")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

export const slugify = (value: string) => fold(value).replaceAll(" ", "-");

export function animeForGenre(genre: GenreDefinition) {
  const accepted = new Set(genre.tags);
  return catalogue.filter((anime) => anime.tags.some((tag) => accepted.has(tag.toLocaleLowerCase("en-US"))));
}

export function genresForAnime(anime: CatalogueAnime) {
  const tags = new Set(anime.tags.map((tag) => tag.toLocaleLowerCase("en-US")));
  return genres.filter((genre) => genre.tags.some((tag) => tags.has(tag)));
}

const companySuffixes = /\b(?:co|ltd|inc|corporation)\b/g;

function studioKey(value: string) {
  return fold(value).replace(companySuffixes, "").replaceAll(" ", "");
}

const knownStudioNames: Record<string, string> = {
  tmsentertainment: "TMS Entertainment",
  mappa: "MAPPA",
  cloverworks: "CloverWorks",
  witstudio: "WIT Studio",
  madhouse: "Madhouse",
  bones: "Bones",
  jcstaff: "J.C.Staff",
  a1pictures: "A-1 Pictures",
  bnpictures: "BN Pictures",
  olm: "OLM",
  studiodeen: "Studio Deen",
  bandainamcopictures: "Bandai Namco Pictures",
  productionig: "Production I.G",
  kinemacitrus: "Kinema Citrus",
  sunrise: "Sunrise",
  lidenfilms: "LIDENFILMS",
  toeianimation: "Toei Animation",
  kyotoanimation: "Kyoto Animation",
  paworks: "P.A. Works",
  shineianimation: "Shin-Ei Animation",
  ufotable: "ufotable",
  pierrot: "Pierrot",
  silverlink: "SILVER LINK.",
  dogakobo: "Doga Kobo",
};

function fallbackStudioName(value: string) {
  return value
    .replace(/\s*,?\s*\b(?:co\.?|ltd\.?|inc\.?|corporation)\b[\s,.]*/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/[,.\s]+$/g, "")
    .trim()
    .split(" ")
    .map((word) => word ? word[0].toLocaleUpperCase("tr-TR") + word.slice(1) : word)
    .join(" ");
}

export type StudioGroup = {
  key: string;
  slug: string;
  name: string;
  aliases: string[];
  anime: CatalogueAnime[];
};

const studioMap = new Map<string, { aliases: Set<string>; anime: Map<string, CatalogueAnime> }>();

for (const anime of catalogue) {
  for (const studio of anime.studios) {
    const key = studioKey(studio);
    if (!key) continue;
    const group = studioMap.get(key) ?? { aliases: new Set<string>(), anime: new Map<string, CatalogueAnime>() };
    group.aliases.add(studio);
    group.anime.set(anime.id, anime);
    studioMap.set(key, group);
  }
}

export const studios: StudioGroup[] = [...studioMap.entries()]
  .map(([key, group]) => {
    const aliases = [...group.aliases].sort((a, b) => a.length - b.length);
    return {
      key,
      slug: slugify(knownStudioNames[key] ?? fallbackStudioName(aliases[0])),
      name: knownStudioNames[key] ?? fallbackStudioName(aliases[0]),
      aliases,
      anime: [...group.anime.values()],
    };
  })
  .filter((studio) => studio.anime.length >= 2)
  .sort((a, b) => b.anime.length - a.anime.length || a.name.localeCompare(b.name, "tr"));

export function studiosForAnime(anime: CatalogueAnime) {
  const keys = new Set(anime.studios.map(studioKey));
  return studios.filter((studio) => keys.has(studio.key));
}

export function rankAnime(items: CatalogueAnime[]) {
  return [...items].sort((a, b) => {
    const aStatus = a.status === "FINISHED" ? 12 : a.status === "ONGOING" ? 10 : -6;
    const bStatus = b.status === "FINISHED" ? 12 : b.status === "ONGOING" ? 10 : -6;
    const aScore = a.status === "UPCOMING" ? 0 : (a.score ?? 0);
    const bScore = b.status === "UPCOMING" ? 0 : (b.score ?? 0);
    return (b.sources.length * 2 + bScore + bStatus) - (a.sources.length * 2 + aScore + aStatus);
  });
}

type RelatedProfile = {
  anime: CatalogueAnime;
  catalogueIndex: number;
  titleKey: string;
  genreSlugs: string[];
  studioKeys: string[];
  tagKeys: string[];
};

const relatedProfiles = new Map<string, RelatedProfile>();
const relatedProfilesByGenre = new Map<string, RelatedProfile[]>();

for (const [catalogueIndex, anime] of catalogue.entries()) {
  const profile: RelatedProfile = {
    anime,
    catalogueIndex,
    titleKey: fold(anime.title),
    genreSlugs: genresForAnime(anime).map((genre) => genre.slug),
    studioKeys: anime.studios.map(studioKey),
    tagKeys: anime.tags.map((tag) => tag.toLocaleLowerCase("en-US")),
  };
  relatedProfiles.set(anime.id, profile);
  for (const genreSlug of profile.genreSlugs) {
    const profiles = relatedProfilesByGenre.get(genreSlug) ?? [];
    profiles.push(profile);
    relatedProfilesByGenre.set(genreSlug, profiles);
  }
}

export function relatedAnime(anime: CatalogueAnime, limit = 6) {
  const target = relatedProfiles.get(anime.id) ?? {
    anime,
    catalogueIndex: -1,
    titleKey: fold(anime.title),
    genreSlugs: genresForAnime(anime).map((genre) => genre.slug),
    studioKeys: anime.studios.map(studioKey),
    tagKeys: anime.tags.map((tag) => tag.toLocaleLowerCase("en-US")),
  };
  const targetGenres = new Set(target.genreSlugs);
  const targetStudios = new Set(target.studioKeys);
  const targetTags = new Set(target.tagKeys);
  const candidates = new Map<string, RelatedProfile>();
  for (const genreSlug of targetGenres) {
    for (const profile of relatedProfilesByGenre.get(genreSlug) ?? []) candidates.set(profile.anime.id, profile);
  }

  return [...candidates.values()]
    .filter((candidate) => candidate.anime.id !== anime.id && candidate.titleKey !== target.titleKey)
    .map((candidate) => {
      const sharedGenres = candidate.genreSlugs.filter((genre) => targetGenres.has(genre)).length;
      const sharedStudios = candidate.studioKeys.filter((studio) => targetStudios.has(studio)).length;
      const sharedTags = candidate.tagKeys.filter((tag) => targetTags.has(tag)).length;
      const yearDistance = Math.abs(candidate.anime.season.year - anime.season.year);
      const score = sharedGenres * 6 + sharedStudios * 5 + Math.min(sharedTags, 8) * .4 + (candidate.anime.type === anime.type ? 1 : 0) + Math.max(0, 2 - yearDistance * .2);
      return { ...candidate, score, sharedGenres };
    })
    .filter(({ score, sharedGenres }) => score >= 6 && sharedGenres > 0)
    .sort((a, b) => b.score - a.score || b.anime.sources.length - a.anime.sources.length || (b.anime.score ?? 0) - (a.anime.score ?? 0) || a.catalogueIndex - b.catalogueIndex)
    .slice(0, limit)
    .map(({ anime: candidate }) => candidate);
}
