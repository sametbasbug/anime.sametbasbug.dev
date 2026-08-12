const EDITORIAL_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const EDITORIAL_MONDAY_EPOCH = Date.UTC(1970, 0, 5);

export function editorialCollectionIndex(date: Date, collectionCount: number) {
  if (!Number.isInteger(collectionCount) || collectionCount < 1) return 0;
  const utcDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const week = Math.floor((utcDay - EDITORIAL_MONDAY_EPOCH) / EDITORIAL_WEEK_MS);
  return ((week % collectionCount) + collectionCount) % collectionCount;
}
