import type { APIRoute } from "astro";
import { catalogue } from "../../lib/catalogue";

export const prerender = true;

/* Orbit ajan ucunun okuduğu TAM katalog (`ROTA_CATALOGUE_URL`). Sözleşmesi
 * `public/orbit-actions.json` ile yayımlanmış ve canlıda doğrulanmış durumda;
 * bu yüzden adresi de içeriği de olduğu gibi kalıyor.
 *
 * Tarayıcı bu dosyayı ARTIK İNDİRMİYOR — onun için zayıflatılmış
 * `/data/katalog.json` var.
 *
 * Buradaki başlık listesi bilerek kısa: sayfa `prerender` edildiği için
 * yanıtı Astro değil GitHub Pages veriyor ve Pages kendi başlıklarını
 * kullanıyor. Önceden burada bir `Cache-Control` duruyordu; hiçbir yere
 * ulaşmıyordu ama okuyana "önbellek ayarlanmış" izlenimi veriyordu.
 */
export const GET: APIRoute = () => new Response(JSON.stringify(catalogue), {
  headers: { "Content-Type": "application/json; charset=utf-8" },
});
