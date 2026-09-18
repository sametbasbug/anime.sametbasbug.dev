import { writeFile } from "node:fs/promises";
import { catalogue, catalogueMeta } from "../src/lib/catalogue";
import { computeRelatedAnime } from "../src/lib/exploration";

const startedAt = performance.now();
const items = Object.fromEntries(
  catalogue.map((anime) => [anime.id, computeRelatedAnime(anime).map((candidate) => candidate.id)]),
);

await writeFile(
  new URL("../src/data/related-anime.json", import.meta.url),
  `${JSON.stringify({ catalogueGeneratedAt: catalogueMeta.generatedAt, items })}\n`,
  "utf8",
);

console.log(`Benzer anime önbelleği üretildi: ${catalogue.length} kayıt, ${Math.round(performance.now() - startedAt)} ms.`);
