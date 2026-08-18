import rawCatalogue from "../src/data/catalogue.json" with { type: "json" };

const CONCURRENCY = 6;
const failures = [];
let completed = 0;

async function checkPoster(anime) {
  const url = anime.poster?.large;
  if (!url) return { id: anime.id, reason: "missing large poster URL" };
  let lastReason = "unknown failure";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        headers: { "User-Agent": "equinox-rota-media-check/1.0" },
        signal: AbortSignal.timeout(20_000),
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (response.ok && contentType.startsWith("image/")) return null;
      lastReason = response.ok ? `unexpected content type: ${contentType}` : `HTTP ${response.status}`;
    } catch (error) {
      lastReason = error instanceof Error ? error.message : String(error);
    }
  }
  return { id: anime.id, url, reason: lastReason };
}

const requestedIds = new Set(process.argv.slice(2));
const queue = requestedIds.size
  ? rawCatalogue.items.filter((anime) => requestedIds.has(anime.id))
  : [...rawCatalogue.items];
const total = queue.length;
if (!total) throw new Error("No catalogue anime matched the requested IDs.");
const workers = Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const anime = queue.shift();
    const failure = await checkPoster(anime);
    if (failure) failures.push(failure);
    completed += 1;
    if (completed % 100 === 0 || completed === total) {
      process.stdout.write(`\rKitsu posterleri: ${completed}/${total}`);
    }
  }
});

await Promise.all(workers);
process.stdout.write("\n");
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  throw new Error(`${failures.length} Kitsu poster URL failed validation.`);
}
console.log(`Kitsu media doğrulaması geçti: ${total}/${total} poster erişilebilir.`);
