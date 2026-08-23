import type { APIRoute } from "astro";
import { catalogue } from "../../lib/catalogue";
import { toBrowserCatalogue } from "../../lib/catalogue-payload";

export const prerender = true;

/* Tarayıcının indirdiği katalog. Gerekçesi ve neyin neden çıkarıldığı
 * `src/lib/catalogue-payload.ts` içinde. */
export const GET: APIRoute = () => new Response(JSON.stringify(toBrowserCatalogue(catalogue)), {
  headers: { "Content-Type": "application/json; charset=utf-8" },
});
