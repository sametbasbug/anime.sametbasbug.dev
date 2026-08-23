import type { APIRoute } from "astro";

export const prerender = true;

/* `public/robots.txt` yerine uç nokta: sitemap adresi `astro.config.mjs`
 * içindeki `site` değerinden geliyor ve elle yazılan ikinci bir kopya
 * bırakmıyor. */
export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL("https://anime.sametbasbug.dev");
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    "# Paylaşılan raflar yetenek bağlantısıdır: adresi bilen görür, dizin görmez.",
    "Disallow: /paylas",
    "Disallow: /hesap",
    "Disallow: /moderasyon",
    "",
    `Sitemap: ${new URL("sitemap-index.xml", origin).href}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
