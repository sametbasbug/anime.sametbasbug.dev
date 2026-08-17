import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const editorialPath = resolve("src/data/editorial.json");
const guidePath = resolve("src/data/editorial-guides.json");
const cataloguePath = resolve("src/data/catalogue.json");
const statuses = new Set(["DRAFT", "IN_REVIEW", "PUBLISHED"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const normalizeSentence = (value) => value
  .toLocaleLowerCase("tr-TR")
  .normalize("NFKD")
  .replace(/\p{M}/gu, "")
  .replace(/[^a-z0-9çğıöşü]+/giu, " ")
  .trim();

const [editorial, guides, catalogue] = await Promise.all([
  readFile(editorialPath, "utf8").then(JSON.parse),
  readFile(guidePath, "utf8").then(JSON.parse),
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
    if (!Array.isArray(collection.animeIds) || collection.animeIds.length !== 5) {
      errors.push(`${label}: seçki beş anime içermeli.`);
      continue;
    }
    for (const animeId of collection.animeIds) {
      if (!publishedIds.has(animeId)) errors.push(`${label}: ${animeId} yayımlanmış editoryal profile bağlı değil.`);
      if (rotatedAnimeIds.has(animeId)) errors.push(`${label}: ${animeId} başka seçkide tekrar ediyor.`);
      rotatedAnimeIds.add(animeId);
    }
  }
}

if (publishedIds.size !== 50) errors.push(`Yayımlanmış profil sayısı tam 50 olmalı; mevcut: ${publishedIds.size}.`);
for (const animeId of publishedIds) {
  if (!rotatedAnimeIds.has(animeId)) errors.push(`${animeId}: yayımlanmış profil ana sayfa rotasyonunda yer almıyor.`);
}

const guideIds = new Set();
if (guides.version !== 1) errors.push("Editoryal rehber veri sürümü 1 olmalı.");
if (!Array.isArray(guides.entries) || guides.entries.length < 7) {
  errors.push("En az yedi editoryal rehber/yazı yayımlanmalı.");
} else {
  const kindCounts = { GUIDE: 0, ESSAY: 0 };
  const focusKinds = new Set();
  for (const [index, guide] of guides.entries.entries()) {
    const label = `guides[${index}] (${guide?.id ?? "kimliksiz"})`;
    if (!guide || typeof guide !== "object") {
      errors.push(`${label}: kayıt nesne olmalı.`);
      continue;
    }
    if (!/^[a-z0-9-]{5,80}$/.test(guide.id ?? "")) errors.push(`${label}: id geçersiz.`);
    if (guideIds.has(guide.id)) errors.push(`${label}: id tekrar ediyor.`);
    guideIds.add(guide.id);
    if (!(guide.kind in kindCounts)) errors.push(`${label}: tür GUIDE veya ESSAY olmalı.`);
    else kindCounts[guide.kind] += 1;
    if (typeof guide.focus !== "string" || guide.focus.length < 8 || guide.focus.length > 40) errors.push(`${label}: odak etiketi 8–40 karakter olmalı.`);
    focusKinds.add(guide.focus);
    if (typeof guide.title !== "string" || guide.title.length < 25 || guide.title.length > 90) errors.push(`${label}: başlık 25–90 karakter olmalı.`);
    if (typeof guide.description !== "string" || guide.description.length < 80 || guide.description.length > 200) errors.push(`${label}: açıklama 80–200 karakter olmalı.`);
    if (typeof guide.intro !== "string" || guide.intro.length < 160 || guide.intro.length > 500) errors.push(`${label}: giriş 160–500 karakter olmalı.`);
    if (!Array.isArray(guide.sections) || guide.sections.length !== 2) {
      errors.push(`${label}: iki yazı bölümü olmalı.`);
    } else {
      for (const section of guide.sections) {
        if (typeof section.heading !== "string" || section.heading.length < 12 || section.heading.length > 80) errors.push(`${label}: bölüm başlığı 12–80 karakter olmalı.`);
        if (typeof section.body !== "string" || section.body.length < 160 || section.body.length > 520) errors.push(`${label}: bölüm metni 160–520 karakter olmalı.`);
      }
    }
    if (!Array.isArray(guide.selections) || guide.selections.length < 2 || guide.selections.length > 5) {
      errors.push(`${label}: seçki 2–5 anime içermeli.`);
    } else {
      const selected = new Set();
      for (const selection of guide.selections) {
        if (!ids.has(selection.animeId)) errors.push(`${label}: ${selection.animeId} katalogda yok.`);
        if (selected.has(selection.animeId)) errors.push(`${label}: ${selection.animeId} seçkide tekrar ediyor.`);
        selected.add(selection.animeId);
        if (typeof selection.note !== "string" || selection.note.length < 45 || selection.note.length > 180) errors.push(`${label}: seçim notu 45–180 karakter olmalı.`);
      }
    }
    if (guide.spoilerSafe !== true) errors.push(`${label}: spoilerSafe onayı zorunlu.`);
    for (const [field, value] of [["publishedAt", guide.publishedAt], ["reviewedAt", guide.reviewedAt]]) {
      if (!datePattern.test(value ?? "") || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) errors.push(`${label}: ${field} geçerli tarih olmalı.`);
    }
    if (guide.reviewedAt < guide.publishedAt) errors.push(`${label}: reviewedAt publishedAt tarihinden eski olamaz.`);
    const copyFields = [guide.title, guide.description, guide.intro, ...(guide.sections ?? []).flatMap((section) => [section.heading, section.body]), ...(guide.selections ?? []).map((selection) => selection.note)];
    if (copyFields.some((value) => /https?:\/\/|www\./i.test(value ?? ""))) errors.push(`${label}: metin bağlantı içeremez.`);
  }
  if (kindCounts.GUIDE < 4) errors.push(`Kalıcı rehber sayısı en az 4 olmalı; mevcut: ${kindCounts.GUIDE}.`);
  if (kindCounts.ESSAY < 3) errors.push(`Editoryal yazı sayısı en az 3 olmalı; mevcut: ${kindCounts.ESSAY}.`);
  for (const focus of ["YÖNETMEN ODAĞI", "STÜDYO ODAĞI", "ANLATI TEMASI"]) {
    if (!focusKinds.has(focus)) errors.push(`${focus}: zorunlu editoryal odak eksik.`);
  }
}

if (errors.length) {
  console.error(`Editoryal doğrulama başarısız (${errors.length} sorun):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const counts = Object.fromEntries([...statuses].map((status) => [status, editorial.entries.filter((entry) => entry.status === status).length]));
  console.log(`Editoryal veri doğrulandı: ${counts.PUBLISHED} yayımlanmış profil, ${guides.entries.length} rehber/yazı, ${counts.IN_REVIEW} kontrolde, ${counts.DRAFT} taslak.`);
}
