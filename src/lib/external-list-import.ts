import { XMLParser } from "fast-xml-parser";
import type { CatalogueAnime } from "./catalogue-ui";
import { mergePersonalListStores, type MergeSummary } from "./list-portability";
import { MAX_PROGRESS, type PersonalListEntry, type PersonalListStore, type PersonalStatus } from "./personal-list";

export const MAX_EXTERNAL_LIST_BYTES = 10 * 1024 * 1024;
export const MAX_EXTERNAL_LIST_RECORDS = 20_000;

export type ExternalListSource = "MAL" | "ANILIST";

type ExternalRecord = {
  externalId: string;
  title: string;
  status: PersonalStatus;
  progress: number;
  score: number | null;
  note: string;
  updatedAt: string;
};

export type ExternalListPreview = {
  source: ExternalListSource;
  sourceCount: number;
  matchedCount: number;
  unmatched: Array<{ externalId: string; title: string }>;
  ambiguous: Array<{ externalId: string; title: string }>;
  skippedCount: number;
  incoming: PersonalListStore;
  merged: PersonalListStore;
  summary: MergeSummary;
};

export class ExternalListImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalListImportError";
  }
}

const malStatuses: Record<string, PersonalStatus> = {
  Watching: "WATCHING",
  Completed: "COMPLETED",
  "Plan to Watch": "PLANNED",
  Dropped: "DROPPED",
  "On-Hold": "WATCHING",
};

const anilistStatuses: Record<number, PersonalStatus> = {
  0: "WATCHING",
  1: "PLANNED",
  2: "COMPLETED",
  3: "DROPPED",
  4: "WATCHING",
  5: "WATCHING",
};

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function textValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function boundedInteger(value: unknown, maximum = MAX_PROGRESS) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(0, Math.floor(number))) : 0;
}

function validInstant(value: unknown, fallback: string) {
  const newestAllowed = Date.now() + 5 * 60 * 1_000;
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= newestAllowed) return new Date(parsed).toISOString();
  const epochSeconds = Number(value);
  const epochMilliseconds = epochSeconds * 1_000;
  if (Number.isFinite(epochMilliseconds) && epochMilliseconds >= 0 && epochMilliseconds <= newestAllowed) return new Date(epochMilliseconds).toISOString();
  return fallback;
}

function noteValue(value: unknown) {
  return typeof value === "string" ? value.slice(0, 600) : "";
}

function normalizeMal(raw: string): { records: ExternalRecord[]; skippedCount: number } {
  let parsed: unknown;
  try {
    parsed = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true }).parse(raw);
  } catch {
    throw new ExternalListImportError("MAL dosyası geçerli XML değil.");
  }
  const root = objectValue(parsed)?.myanimelist;
  const animeValue = objectValue(root)?.anime;
  const rows = Array.isArray(animeValue) ? animeValue : animeValue ? [animeValue] : [];
  if (!rows.length) throw new ExternalListImportError("MAL dosyasında anime listesi bulunamadı.");
  if (rows.length > MAX_EXTERNAL_LIST_RECORDS) throw new ExternalListImportError(`En fazla ${MAX_EXTERNAL_LIST_RECORDS.toLocaleString("tr-TR")} kayıt içe aktarılabilir.`);

  const records: ExternalRecord[] = [];
  let skippedCount = 0;
  for (const rowValue of rows) {
    const row = objectValue(rowValue);
    const externalId = textValue(row?.series_animedb_id);
    const status = malStatuses[textValue(row?.my_status)];
    if (!/^\d+$/.test(externalId) || !status) { skippedCount += 1; continue; }
    const score = boundedInteger(row?.my_score, 10);
    records.push({
      externalId,
      title: textValue(row?.series_title) || `MAL #${externalId}`,
      status,
      progress: boundedInteger(row?.my_watched_episodes),
      score: score > 0 ? score : null,
      note: noteValue(row?.my_comments),
      updatedAt: validInstant(row?.my_last_updated, "1970-01-01T00:00:00.000Z"),
    });
  }
  return { records, skippedCount };
}

function normalizeAnilist(raw: string): { records: ExternalRecord[]; skippedCount: number } {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new ExternalListImportError("AniList dosyası geçerli JSON değil."); }
  const lists = objectValue(parsed)?.lists;
  if (!Array.isArray(lists)) throw new ExternalListImportError("AniList GDPR dosyasında liste kayıtları bulunamadı.");
  if (lists.length > MAX_EXTERNAL_LIST_RECORDS) throw new ExternalListImportError(`En fazla ${MAX_EXTERNAL_LIST_RECORDS.toLocaleString("tr-TR")} kayıt içe aktarılabilir.`);

  const records: ExternalRecord[] = [];
  let skippedCount = 0;
  for (const rowValue of lists) {
    const row = objectValue(rowValue);
    if (Number(row?.series_type) !== 0) continue;
    const externalId = textValue(row?.series_id);
    const status = anilistStatuses[Number(row?.status)];
    if (!/^\d+$/.test(externalId) || !status) { skippedCount += 1; continue; }
    const rawScore = Number(row?.score);
    const normalizedScore = Number.isFinite(rawScore) && rawScore > 0
      ? Math.min(10, Math.max(1, Math.round(rawScore / 10)))
      : null;
    records.push({
      externalId,
      title: `AniList #${externalId}`,
      status,
      progress: boundedInteger(row?.progress),
      score: normalizedScore,
      note: noteValue(row?.notes),
      updatedAt: validInstant(row?.updated_at, "1970-01-01T00:00:00.000Z"),
    });
  }
  if (!records.length && !skippedCount) throw new ExternalListImportError("AniList dosyasında anime kaydı bulunamadı.");
  return { records, skippedCount };
}

export function createExternalListPreview(source: ExternalListSource, raw: string, catalogue: CatalogueAnime[], current: PersonalListStore): ExternalListPreview {
  const normalized = source === "MAL" ? normalizeMal(raw) : normalizeAnilist(raw);
  const byExternalId = new Map<string, CatalogueAnime>();
  const ambiguousIds = new Set<string>();
  for (const anime of catalogue) {
    const externalId = source === "MAL" ? anime.malId : anime.anilistId;
    if (!externalId) continue;
    if (byExternalId.has(externalId)) {
      byExternalId.delete(externalId);
      ambiguousIds.add(externalId);
    } else if (!ambiguousIds.has(externalId)) {
      byExternalId.set(externalId, anime);
    }
  }

  const incoming: PersonalListStore = { version: 2, entries: {}, tombstones: {} };
  const unmatched: ExternalListPreview["unmatched"] = [];
  const ambiguous: ExternalListPreview["ambiguous"] = [];
  for (const record of normalized.records) {
    if (ambiguousIds.has(record.externalId)) { ambiguous.push({ externalId: record.externalId, title: record.title }); continue; }
    const anime = byExternalId.get(record.externalId);
    if (!anime) { unmatched.push({ externalId: record.externalId, title: record.title }); continue; }
    const entry: PersonalListEntry = { ...record, animeId: anime.id };
    delete (entry as PersonalListEntry & { externalId?: string; title?: string }).externalId;
    delete (entry as PersonalListEntry & { externalId?: string; title?: string }).title;
    const previous = incoming.entries[anime.id];
    if (!previous || Date.parse(entry.updatedAt) > Date.parse(previous.updatedAt)) incoming.entries[anime.id] = entry;
  }
  const { store: merged, summary } = mergePersonalListStores(current, incoming);
  return {
    source,
    sourceCount: normalized.records.length,
    matchedCount: Object.keys(incoming.entries).length,
    unmatched,
    ambiguous,
    skippedCount: normalized.skippedCount,
    incoming,
    merged,
    summary,
  };
}
