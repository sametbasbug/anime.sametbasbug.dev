import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildShareUrl, isShareToken, normalizeSharedProfile } from "../src/lib/profile-sharing";

const token = "24c1c9ac-42b1-4d04-8a41-1db07d08f7f8";
assert.equal(isShareToken(token), true);
assert.equal(isShareToken("not-a-token"), false);
assert.equal(buildShareUrl("https://anime.sametbasbug.dev", token), `https://anime.sametbasbug.dev/paylas?rota=${token}`);

const normalized = normalizeSharedProfile({
  display_name: "  Nyx  ",
  list_visibility: "UNLISTED",
  share_scores: true,
  share_notes: false,
  entries: [
    { anime_id: "1", status: "WATCHING", progress: 4.9, score: 8, note: null },
    { anime_id: "bad", status: "UNKNOWN", progress: 0, score: 5, note: "drop me" },
  ],
});
assert.ok(normalized);
assert.equal(normalized.display_name, "Nyx");
assert.equal(normalized.entries.length, 1);
assert.equal(normalized.entries[0]?.progress, 4);
assert.equal(normalizeSharedProfile({ list_visibility: "PRIVATE", entries: [] }), null);

const migration = await readFile(new URL("../supabase/migrations/202608120003_shareable_profiles.sql", import.meta.url), "utf8");
for (const requiredRule of [
  "profiles_share_token_idx",
  "security definer",
  "profile.list_visibility in ('UNLISTED', 'PUBLIC')",
  "entry.deleted_at is null",
  "case when profile.share_scores",
  "case when profile.share_notes",
  "rotate_profile_share_token",
  "revoke all on function public.get_shared_profile(uuid) from public",
]) {
  assert.ok(migration.includes(requiredRule), `Paylaşım migration'ında eksik koruma: ${requiredRule}`);
}

for (const forbiddenField of ["auth.users", "email", "client_updated_at'", "user_id'"]) {
  const rpcBody = migration.slice(
    migration.indexOf("create or replace function public.get_shared_profile"),
    migration.indexOf("create or replace function public.rotate_profile_share_token"),
  );
  assert.equal(rpcBody.includes(forbiddenField), false, `Paylaşım RPC'si özel alan sızdırıyor: ${forbiddenField}`);
}

console.log("Paylaşılabilir profil bağlantısı ve veri sınırları doğrulandı.");
