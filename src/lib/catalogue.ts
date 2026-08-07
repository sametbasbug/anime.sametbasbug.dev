import rawCatalogue from "../data/catalogue.json";
import type { CatalogueAnime } from "./catalogue-ui";

export const catalogue = rawCatalogue.items as CatalogueAnime[];
export const catalogueMeta = rawCatalogue.meta;
export type { CatalogueAnime } from "./catalogue-ui";
export * from "./catalogue-ui";
