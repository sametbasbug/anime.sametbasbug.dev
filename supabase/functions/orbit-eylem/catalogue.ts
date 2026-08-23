export type AgentCatalogueAnime = {
  id: string;
  kitsuId: string;
  malId?: string | null;
  slug: string;
  title: string;
  type: string;
  episodes: number;
  status: string;
  synonyms: string[];
};

export type AgentCatalogue = {
  items: AgentCatalogueAnime[];
  byId: Map<string, AgentCatalogueAnime>;
};

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function parseCatalogue(value: unknown): AgentCatalogue | null {
  const items = (value as { items?: unknown })?.items;
  if (!Array.isArray(items)) return null;

  const valid = items.filter((item): item is AgentCatalogueAnime => {
    const anime = item as Partial<AgentCatalogueAnime>;
    return typeof anime.id === 'string'
      && anime.id.length > 0
      && typeof anime.kitsuId === 'string'
      && typeof anime.slug === 'string'
      && typeof anime.title === 'string'
      && typeof anime.type === 'string'
      && typeof anime.episodes === 'number'
      && typeof anime.status === 'string'
      && Array.isArray(anime.synonyms);
  });
  if (valid.length !== items.length || valid.length === 0) return null;

  return { items: valid, byId: new Map(valid.map((anime) => [anime.id, anime])) };
}

export function findCatalogueAnime(catalogue: AgentCatalogue, animeId: string) {
  return catalogue.byId.get(animeId) ?? null;
}

export function searchCatalogue(catalogue: AgentCatalogue, query: string, limit: number) {
  const needle = normalize(query);
  if (!needle) return [];

  const exactExternal = needle.match(/^(kitsu|mal)\s+(\d+)$/);
  const ranked: Array<{ anime: AgentCatalogueAnime; rank: number }> = [];
  for (const anime of catalogue.items) {
    let rank = 0;
    if (anime.id === query) rank = 100;
    else if (exactExternal?.[1] === 'kitsu' && anime.kitsuId === exactExternal[2]) rank = 95;
    else if (exactExternal?.[1] === 'mal' && anime.malId === exactExternal[2]) rank = 95;
    else {
      const title = normalize(anime.title);
      const synonyms = anime.synonyms.map(normalize);
      if (title === needle || synonyms.includes(needle)) rank = 90;
      else if (title.startsWith(needle) || synonyms.some((value) => value.startsWith(needle))) rank = 70;
      else if (title.includes(needle) || synonyms.some((value) => value.includes(needle))) rank = 50;
    }
    if (rank > 0) ranked.push({ anime, rank });
  }

  return ranked
    .sort((left, right) => right.rank - left.rank || left.anime.title.localeCompare(right.anime.title, 'tr'))
    .slice(0, limit)
    .map(({ anime }) => anime);
}
