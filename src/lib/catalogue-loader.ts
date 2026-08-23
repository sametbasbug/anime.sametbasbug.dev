import type { CatalogueAnime } from "./catalogue-ui";

/**
 * Tarayıcı katalog yükünü indirir.
 *
 * Dokuz bileşen aynı `fetch` + hata yakalama üçlemesini kopyalayarak
 * taşıyordu. Tek yere alınması yalnız tekrarı azaltmıyor: adres, sürüm
 * parametresi ve hata davranışı artık dokuz yerde ayrı ayrı değil, burada bir
 * kez değişiyor.
 */
export async function loadBrowserCatalogue(dataVersion: string): Promise<CatalogueAnime[]> {
  const response = await fetch(`/data/katalog.json?v=${encodeURIComponent(dataVersion)}`);
  if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`);
  return await response.json() as CatalogueAnime[];
}
