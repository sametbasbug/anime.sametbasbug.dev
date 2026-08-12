import rawEditorial from "../data/editorial.json";
export { editorialCollectionIndex } from "./editorial-rotation";

export const editorialStatusLabels = {
  DRAFT: "Taslak",
  IN_REVIEW: "Editoryal kontrolde",
  PUBLISHED: "Yayımlandı",
} as const;

export type EditorialStatus = keyof typeof editorialStatusLabels;

export type EditorialEntry = {
  animeId: string;
  status: EditorialStatus;
  headline: string;
  summary?: string;
  whyWatch?: string[];
  verdict?: string;
  audience?: string;
  spoilerSafe?: boolean;
  updatedAt: string;
  reviewedAt?: string;
};

export type PublishedEditorial = EditorialEntry & {
  status: "PUBLISHED";
  summary: string;
  whyWatch: [string, string, string];
  verdict: string;
  audience: string;
  spoilerSafe: true;
  reviewedAt: string;
};

export type HomepageEditorialCollection = {
  id: string;
  label: string;
  title: string;
  description: string;
  animeIds: [string, string, string, string];
};

const entries = rawEditorial.entries as EditorialEntry[];
const byAnimeId = new Map(entries.map((entry) => [entry.animeId, entry]));

export const homepageEditorialCollections = rawEditorial.homepageCollections as HomepageEditorialCollection[];

export const editorialStats = {
  total: entries.length,
  draft: entries.filter((entry) => entry.status === "DRAFT").length,
  inReview: entries.filter((entry) => entry.status === "IN_REVIEW").length,
  published: entries.filter((entry) => entry.status === "PUBLISHED").length,
};

export function editorialForAnime(animeId: string): PublishedEditorial | undefined {
  const entry = byAnimeId.get(animeId);
  if (!entry || entry.status !== "PUBLISHED") return undefined;
  return entry as PublishedEditorial;
}
