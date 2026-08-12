import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_BODY_MIN_LENGTH,
  averageReviewScore,
  validateReviewDraft,
  type PublicReview,
} from "../src/lib/community";

const validDraft = {
  body: "Karakter gelişimi sakin ama finalde karşılığını veriyor.",
  score: 8,
  containsSpoiler: false,
};

assert.equal(validateReviewDraft(validDraft), null);
assert.match(validateReviewDraft({ ...validDraft, body: "Kısa." }) ?? "", /en az/);
assert.match(validateReviewDraft({ ...validDraft, body: "x".repeat(REVIEW_BODY_MAX_LENGTH + 1) }) ?? "", /en fazla/);
assert.match(validateReviewDraft({ ...validDraft, score: 11 }) ?? "", /1 ile 10/);
assert.match(validateReviewDraft({ ...validDraft, body: "Bu inceleme https://example.com adresine gidiyor." }) ?? "", /bağlantı/);
assert.equal([..."x".repeat(REVIEW_BODY_MIN_LENGTH)].length, REVIEW_BODY_MIN_LENGTH);

const sampleReviews = [6, null, 10].map((score, index) => ({
  id: String(index),
  anime_id: "sample",
  body: validDraft.body,
  score,
  contains_spoiler: false,
  author_name: "Yolcu",
  created_at: "2026-08-12T00:00:00Z",
  updated_at: "2026-08-12T00:00:00Z",
})) satisfies PublicReview[];
assert.equal(averageReviewScore(sampleReviews), 8);
assert.equal(averageReviewScore(sampleReviews.map((review) => ({ ...review, score: null }))), null);

const migration = await readFile(new URL("../supabase/migrations/202608120002_community_reviews_and_moderation.sql", import.meta.url), "utf8");
for (const requiredRule of [
  "enable row level security",
  "revoke all on public.community_reviews from anon, authenticated",
  "security definer",
  "Links are not allowed in reviews",
  "Authors cannot report their own review",
  "Reports never hide content automatically",
  "rota_role",
]) {
  assert.ok(migration.includes(requiredRule), `Community migration is missing: ${requiredRule}`);
}

console.log("Topluluk incelemesi, spoiler ve moderasyon korumaları doğrulandı.");
