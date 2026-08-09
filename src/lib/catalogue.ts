import rawCatalogue from "../data/catalogue.json";
import rawTmdbPosters from "../data/tmdb-posters.json";
import type { CatalogueAnime } from "./catalogue-ui";

type TmdbPosterMatch = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  posterPath: string;
};

const tmdbPosters = rawTmdbPosters.entries as Record<string, TmdbPosterMatch>;

export const catalogue = rawCatalogue.items.map((anime) => {
  const match = tmdbPosters[anime.id];
  return match
    ? {
        ...anime,
        poster: {
          provider: "tmdb" as const,
          path: match.posterPath,
          tmdbId: match.tmdbId,
          mediaType: match.mediaType,
        },
      }
    : anime;
}) as CatalogueAnime[];
export const catalogueMeta = rawCatalogue.meta;
export const posterMeta = rawTmdbPosters.meta;
export type { CatalogueAnime } from "./catalogue-ui";
export * from "./catalogue-ui";
