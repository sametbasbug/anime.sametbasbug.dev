import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const editorialPath = resolve("src/data/editorial.json");
const cataloguePath = resolve("src/data/catalogue.json");
const statuses = new Set(["DRAFT", "IN_REVIEW", "PUBLISHED"]);

const [editorial, catalogue] = await Promise.all([
  readFile(editorialPath, "utf8").then(JSON.parse),
  readFile(cataloguePath, "utf8").then(JSON.parse),
]);

const errors = [];
const ids = new Set(catalogue.items.map((anime) => anime.id));
const seen = new Set();

if (editorial.version !== 1) errors.push("Editoryal veri sürümü 1 olmalı.");
if (!Array.isArray(editorial.entries)) errors.push("Editoryal kayıtlar bir dizi olmalı.");

for (const [index, entry] of (editorial.entries ?? []).entries()) {
  const label = `entries[${index}] (${entry?.animeId ?? "kimliksiz"})`;
  if (!entry || typeof entry !== "object") {
    errors.push(`${label}: kayıt nesne olmalı.`);
    continue;
  }
  if (!ids.has(entry.animeId)) errors.push(`${label}: katalogda karşılığı yok.`);
  if (seen.has(entry.animeId)) errors.push(`${label}: animeId tekrar ediyor.`);
  seen.add(entry.animeId);
  if (!statuses.has(entry.status)) errors.push(`${label}: durum geçersiz.`);
  if (typeof entry.headline !== "string" || entry.headline.length < 20 || entry.headline.length > 100) {
    errors.push(`${label}: başlık 20–100 karakter olmalı.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.updatedAt ?? "")) errors.push(`${label}: updatedAt YYYY-AA-GG olmalı.`);

  if (entry.status === "IN_REVIEW" || entry.status === "PUBLISHED") {
    if (typeof entry.summary !== "string" || entry.summary.length < 140 || entry.summary.length > 500) {
      errors.push(`${label}: özet 140–500 karakter olmalı.`);
    }
    if (!Array.isArray(entry.whyWatch) || entry.whyWatch.length !== 3 || entry.whyWatch.some((item) => typeof item !== "string" || item.length < 60 || item.length > 240)) {
      errors.push(`${label}: neden izlenir alanı 60–240 karakterlik üç maddeden oluşmalı.`);
    }
    if (typeof entry.verdict !== "string" || entry.verdict.length < 120 || entry.verdict.length > 420) {
      errors.push(`${label}: değerlendirme 120–420 karakter olmalı.`);
    }
    if (typeof entry.audience !== "string" || entry.audience.length < 70 || entry.audience.length > 260) {
      errors.push(`${label}: izleyici notu 70–260 karakter olmalı.`);
    }
  }

  if (entry.status === "PUBLISHED" && !/^\d{4}-\d{2}-\d{2}$/.test(entry.reviewedAt ?? "")) {
    errors.push(`${label}: yayımlanmış içerikte reviewedAt zorunlu.`);
  }
}

if (errors.length) {
  console.error(`Editoryal doğrulama başarısız (${errors.length} sorun):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const counts = Object.fromEntries([...statuses].map((status) => [status, editorial.entries.filter((entry) => entry.status === status).length]));
  console.log(`Editoryal veri doğrulandı: ${counts.PUBLISHED} yayımlanmış, ${counts.IN_REVIEW} kontrolde, ${counts.DRAFT} taslak.`);
}
