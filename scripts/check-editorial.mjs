import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const editorialPath = resolve("src/data/editorial.json");
const cataloguePath = resolve("src/data/catalogue.json");
const statuses = new Set(["DRAFT", "IN_REVIEW", "PUBLISHED"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const normalizeSentence = (value) => value
  .toLocaleLowerCase("tr-TR")
  .normalize("NFKD")
  .replace(/\p{M}/gu, "")
  .replace(/[^a-z0-9çğıöşü]+/giu, " ")
  .trim();

const [editorial, catalogue] = await Promise.all([
  readFile(editorialPath, "utf8").then(JSON.parse),
  readFile(cataloguePath, "utf8").then(JSON.parse),
]);

const errors = [];
const ids = new Set(catalogue.items.map((anime) => anime.id));
const seen = new Set();
const publishedIds = new Set();
const sentenceOwners = new Map();

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
  if (!datePattern.test(entry.updatedAt ?? "") || Number.isNaN(Date.parse(`${entry.updatedAt}T00:00:00Z`))) {
    errors.push(`${label}: updatedAt geçerli bir YYYY-AA-GG tarihi olmalı.`);
  }

  if (entry.status === "IN_REVIEW" || entry.status === "PUBLISHED") {
    if (entry.spoilerSafe !== true) errors.push(`${label}: spoilerSafe editoryal onayı zorunlu.`);
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

    const copyFields = [entry.headline, entry.summary, ...(entry.whyWatch ?? []), entry.verdict, entry.audience];
    if (copyFields.some((value) => /https?:\/\/|www\./i.test(value ?? ""))) {
      errors.push(`${label}: editoryal metin bağlantı içeremez.`);
    }
    for (const value of copyFields) {
      for (const sentence of String(value ?? "").split(/[.!?]+/)) {
        const normalized = normalizeSentence(sentence);
        if (normalized.length < 55) continue;
        const owner = sentenceOwners.get(normalized);
        if (owner && owner !== entry.animeId) errors.push(`${label}: ${owner} kaydıyla yinelenen uzun cümle bulundu.`);
        sentenceOwners.set(normalized, entry.animeId);
      }
    }
  }

  if (entry.status === "PUBLISHED") {
    publishedIds.add(entry.animeId);
    if (!datePattern.test(entry.reviewedAt ?? "") || Number.isNaN(Date.parse(`${entry.reviewedAt}T00:00:00Z`))) {
      errors.push(`${label}: yayımlanmış içerikte geçerli reviewedAt zorunlu.`);
    } else if (entry.reviewedAt < entry.updatedAt) {
      errors.push(`${label}: reviewedAt updatedAt tarihinden eski olamaz.`);
    }
  }
}

const collectionIds = new Set();
const rotatedAnimeIds = new Set();
if (!Array.isArray(editorial.homepageCollections) || editorial.homepageCollections.length < 3) {
  errors.push("Ana sayfa için en az üç editoryal seçki olmalı.");
} else {
  for (const [index, collection] of editorial.homepageCollections.entries()) {
    const label = `homepageCollections[${index}] (${collection?.id ?? "kimliksiz"})`;
    if (!collection || typeof collection !== "object") {
      errors.push(`${label}: seçki nesne olmalı.`);
      continue;
    }
    if (!/^[a-z0-9-]{3,60}$/.test(collection.id ?? "")) errors.push(`${label}: id geçersiz.`);
    if (collectionIds.has(collection.id)) errors.push(`${label}: id tekrar ediyor.`);
    collectionIds.add(collection.id);
    if (typeof collection.label !== "string" || collection.label.length < 10 || collection.label.length > 60) errors.push(`${label}: etiket 10–60 karakter olmalı.`);
    if (typeof collection.title !== "string" || collection.title.length < 20 || collection.title.length > 80) errors.push(`${label}: başlık 20–80 karakter olmalı.`);
    if (typeof collection.description !== "string" || collection.description.length < 70 || collection.description.length > 180) errors.push(`${label}: açıklama 70–180 karakter olmalı.`);
    if (!Array.isArray(collection.animeIds) || collection.animeIds.length !== 4) {
      errors.push(`${label}: seçki dört anime içermeli.`);
      continue;
    }
    for (const animeId of collection.animeIds) {
      if (!publishedIds.has(animeId)) errors.push(`${label}: ${animeId} yayımlanmış editoryal profile bağlı değil.`);
      if (rotatedAnimeIds.has(animeId)) errors.push(`${label}: ${animeId} başka seçkide tekrar ediyor.`);
      rotatedAnimeIds.add(animeId);
    }
  }
}

if (publishedIds.size < 20 || publishedIds.size > 30) errors.push(`Yayımlanmış profil sayısı 20–30 aralığında olmalı; mevcut: ${publishedIds.size}.`);
for (const animeId of publishedIds) {
  if (!rotatedAnimeIds.has(animeId)) errors.push(`${animeId}: yayımlanmış profil ana sayfa rotasyonunda yer almıyor.`);
}

if (errors.length) {
  console.error(`Editoryal doğrulama başarısız (${errors.length} sorun):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const counts = Object.fromEntries([...statuses].map((status) => [status, editorial.entries.filter((entry) => entry.status === status).length]));
  console.log(`Editoryal veri doğrulandı: ${counts.PUBLISHED} yayımlanmış, ${counts.IN_REVIEW} kontrolde, ${counts.DRAFT} taslak.`);
}
