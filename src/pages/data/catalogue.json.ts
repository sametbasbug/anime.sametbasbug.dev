import type { APIRoute } from "astro";
import rawCatalogue from "../../data/catalogue.json";

export const prerender = true;

export const GET: APIRoute = () => new Response(JSON.stringify(rawCatalogue.items), {
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
  },
});
