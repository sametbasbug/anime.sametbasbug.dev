import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

/* `site` yalnız sitemap için değil: kanonik adres, og:url ve paylaşım görseli
 * artık tek bir yerden geliyor. Önceden origin `BaseLayout.astro` içinde elle
 * yazılıydı ve derleme bunun doğru olduğunu hiçbir yerde kontrol etmiyordu. */
export default defineConfig({
  site: "https://anime.sametbasbug.dev",
  integrations: [
    react(),
    sitemap({
      /* Kişisel yüzeyler dizinde işi yok: `/paylas` zaten `noindex` taşıyor,
       * `/hesap` ve `/moderasyon` ise giriş yapılmadan boş kabuk. */
      filter: (page) => !/\/(paylas|hesap|moderasyon)\/?$/.test(page),
    }),
  ],
  output: "static",
});
