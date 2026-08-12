export const REVIEW_BODY_MIN_LENGTH = 20;
export const REVIEW_BODY_MAX_LENGTH = 2000;
export const REPORT_DETAIL_MAX_LENGTH = 500;

export type ReviewDraft = {
  body: string;
  score: number | null;
  containsSpoiler: boolean;
};

export type PublicReview = {
  id: string;
  anime_id: string;
  body: string;
  score: number | null;
  contains_spoiler: boolean;
  author_name: string;
  created_at: string;
  updated_at: string;
};

export type MyReview = Omit<PublicReview, "author_name"> & {
  moderation_status: "PUBLISHED" | "HIDDEN" | "REMOVED";
  moderation_note: string;
};

export const reportReasons = {
  SPOILER: "İşaretlenmemiş spoiler",
  ABUSE: "Taciz veya nefret söylemi",
  PIRACY: "Korsan yayın yönlendirmesi",
  SPAM: "Spam veya yanıltıcı içerik",
  OTHER: "Diğer",
} as const;

export type ReportReason = keyof typeof reportReasons;

export function reviewBodyLength(body: string) {
  return [...body.trim()].length;
}

export function validateReviewDraft(draft: ReviewDraft): string | null {
  const length = reviewBodyLength(draft.body);
  if (length < REVIEW_BODY_MIN_LENGTH) {
    return `İnceleme en az ${REVIEW_BODY_MIN_LENGTH} karakter olmalı.`;
  }
  if (length > REVIEW_BODY_MAX_LENGTH) {
    return `İnceleme en fazla ${REVIEW_BODY_MAX_LENGTH} karakter olabilir.`;
  }
  if (draft.score !== null && (!Number.isInteger(draft.score) || draft.score < 1 || draft.score > 10)) {
    return "Puan 1 ile 10 arasında olmalı.";
  }
  if (/(?:https?:\/\/|www\.)\S+/i.test(draft.body)) {
    return "İncelemelerde bağlantı paylaşılmaz.";
  }
  return null;
}

export function averageReviewScore(reviews: PublicReview[]) {
  const scores = reviews.flatMap((review) => review.score === null ? [] : [review.score]);
  if (scores.length === 0) return null;
  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

export function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarih bilinmiyor";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
