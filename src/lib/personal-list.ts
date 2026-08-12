export const PERSONAL_LIST_STORAGE_KEY = "rota.personal-list.v1";
export const PERSONAL_LIST_EVENT = "rota:personal-list-change";

export const personalStatusLabels = {
  WATCHING: "İzliyorum",
  COMPLETED: "Tamamladım",
  PLANNED: "Planlıyorum",
  DROPPED: "Bıraktım",
} as const;

export type PersonalStatus = keyof typeof personalStatusLabels;

export type PersonalListEntry = {
  animeId: string;
  status: PersonalStatus;
  progress: number;
  score: number | null;
  note: string;
  updatedAt: string;
};

export type PersonalListStore = {
  version: 2;
  entries: Record<string, PersonalListEntry>;
  tombstones: Record<string, string>;
};

const statuses = new Set<PersonalStatus>(Object.keys(personalStatusLabels) as PersonalStatus[]);

// `personal_list_entries.progress` sütunundaki üst sınırla aynı tutulur; aksi
// halde tek bir uç değer, toplu upsert'i ve dolayısıyla tüm senkronizasyonu
// reddettirir.
export const MAX_PROGRESS = 100000;

function emptyStore(): PersonalListStore {
  return { version: 2, entries: {}, tombstones: {} };
}

function nextVersion(...versions: Array<string | undefined>) {
  const previousTime = versions.reduce((latest, version) => {
    if (!version) return latest;
    const time = Date.parse(version);
    return Number.isNaN(time) ? latest : Math.max(latest, time);
  }, 0);
  return new Date(Math.max(Date.now(), previousTime + 1)).toISOString();
}

function sanitizeEntry(value: unknown): PersonalListEntry | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PersonalListEntry>;
  if (typeof candidate.animeId !== "string" || !candidate.animeId) return null;
  if (!candidate.status || !statuses.has(candidate.status)) return null;

  const progress = Number.isFinite(candidate.progress)
    ? Math.min(MAX_PROGRESS, Math.max(0, Math.floor(candidate.progress ?? 0)))
    : 0;
  const rawScore = candidate.score === null ? null : Number(candidate.score);
  const score = rawScore !== null && Number.isFinite(rawScore) && rawScore >= 1 && rawScore <= 10
    ? Math.round(rawScore)
    : null;

  return {
    animeId: candidate.animeId,
    status: candidate.status,
    progress,
    score,
    note: typeof candidate.note === "string" ? candidate.note.slice(0, 600) : "",
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date().toISOString(),
  };
}

export function readPersonalList(): PersonalListStore {
  if (typeof window === "undefined") return emptyStore();

  try {
    const raw = window.localStorage.getItem(PERSONAL_LIST_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<PersonalListStore>;
    const entries: Record<string, PersonalListEntry> = {};

    for (const value of Object.values(parsed.entries ?? {})) {
      const entry = sanitizeEntry(value);
      if (entry) entries[entry.animeId] = entry;
    }

    const tombstones: Record<string, string> = {};
    if (parsed.version === 2 && "tombstones" in parsed && parsed.tombstones && typeof parsed.tombstones === "object") {
      for (const [animeId, deletedAt] of Object.entries(parsed.tombstones as Record<string, unknown>)) {
        if (typeof deletedAt === "string" && deletedAt) tombstones[animeId] = deletedAt;
      }
    }

    return { version: 2, entries, tombstones };
  } catch {
    return emptyStore();
  }
}

export function replacePersonalList(store: PersonalListStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PERSONAL_LIST_STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(PERSONAL_LIST_EVENT));
}

export function writePersonalEntry(entry: PersonalListEntry) {
  if (typeof window === "undefined") return entry;
  const store = readPersonalList();
  const sanitized = sanitizeEntry({
    ...entry,
    updatedAt: nextVersion(store.entries[entry.animeId]?.updatedAt, store.tombstones[entry.animeId]),
  });
  if (!sanitized) return entry;
  store.entries[sanitized.animeId] = sanitized;
  delete store.tombstones[sanitized.animeId];
  replacePersonalList(store);
  return sanitized;
}

export function createPersonalEntry(animeId: string): PersonalListEntry {
  return writePersonalEntry({
    animeId,
    status: "PLANNED",
    progress: 0,
    score: null,
    note: "",
    updatedAt: new Date().toISOString(),
  });
}

export function removePersonalEntry(animeId: string) {
  if (typeof window === "undefined") return;
  const store = readPersonalList();
  const deletedAt = nextVersion(store.entries[animeId]?.updatedAt, store.tombstones[animeId]);
  delete store.entries[animeId];
  store.tombstones[animeId] = deletedAt;
  replacePersonalList(store);
}

export function subscribeToPersonalList(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === PERSONAL_LIST_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PERSONAL_LIST_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PERSONAL_LIST_EVENT, callback);
  };
}
