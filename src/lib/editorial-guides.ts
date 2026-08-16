import rawGuides from "../data/editorial-guides.json";

export const editorialGuideKindLabels = {
  GUIDE: "Kalıcı rehber",
  ESSAY: "Editoryal yazı",
} as const;

export type EditorialGuideKind = keyof typeof editorialGuideKindLabels;

export type EditorialGuideSelection = {
  animeId: string;
  note: string;
};

export type EditorialGuideSection = {
  heading: string;
  body: string;
};

export type EditorialGuide = {
  id: string;
  kind: EditorialGuideKind;
  focus: string;
  title: string;
  description: string;
  intro: string;
  sections: [EditorialGuideSection, EditorialGuideSection];
  selections: EditorialGuideSelection[];
  spoilerSafe: true;
  publishedAt: string;
  reviewedAt: string;
};

export const editorialGuides = rawGuides.entries as EditorialGuide[];
export const permanentGuides = editorialGuides.filter((entry) => entry.kind === "GUIDE");
export const editorialEssays = editorialGuides.filter((entry) => entry.kind === "ESSAY");

export function editorialGuideForSlug(slug: string) {
  return editorialGuides.find((entry) => entry.id === slug);
}
