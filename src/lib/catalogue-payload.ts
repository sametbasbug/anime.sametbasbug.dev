import type { CatalogueAnime } from "./catalogue-ui";

/**
 * Tarayıcıya inen katalog yükü.
 *
 * Sorun şuydu: dokuz etkileşimli bileşenin her biri `/data/catalogue.json`'ın
 * TAMAMINI indiriyordu — 9,6 MB ham, 1,8 MB gzip. Ölçtüğümüzde ağırlığın
 * yarısından fazlasının tarayıcıda HİÇ okunmayan alanlarda olduğu çıktı:
 *
 *   cover            1,41 MB  hiçbir yerde çizilmiyor
 *   poster.tiny/original      `AnimeArtwork` yalnız small/medium/large kullanıyor
 *   titleEnglish/Romaji/Native 0,80 MB  başlık veri tazelemesinde zaten seçiliyor
 *   sources          0,31 MB  yalnız `.length` okunuyor
 *   ratingRank/userCount/kitsuId 0,37 MB  hiç okunmuyor
 *
 * Tek yük halinde bırakıldı, ikiye bölünmedi: `tags`, `synonyms` ve `studios`
 * dokuz tüketicinin altısında gerekiyor (arama, sezon panosu, öneriler,
 * koleksiyonlar, kişisel istatistikler, yıllık). Bölmek üç sayfa kazandırıp
 * altı sayfaya ikinci bir istek ekler ve her bileşen için "hangi yük yeter"
 * kararını doğru vermeyi şart koşardı; yanlış verilen bir karar çökmeden,
 * sessizce boş bir tür grafiği olarak görünürdü.
 *
 * `/data/catalogue.json` DOKUNULMADAN duruyor: onu Orbit ajan ucu okuyor
 * (`ROTA_CATALOGUE_URL`) ve sözleşmesi `public/orbit-actions.json` ile
 * yayımlanmış. Sunucudan sunucuya, beş dakikada bir yapılan o çağrıda boyut
 * zaten sorun değil.
 */

/** Tarayıcı yükünün taşıdığı alanlar. Hepsi `CatalogueAnime` ile uyumlu. */
export function toBrowserCatalogue(items: CatalogueAnime[]): CatalogueAnime[] {
  return items.map((anime) => {
    const record: CatalogueAnime = {
      id: anime.id,
      slug: anime.slug,
      title: anime.title,
      type: anime.type,
      episodes: anime.episodes,
      status: anime.status,
      season: anime.season,
      durationSeconds: anime.durationSeconds,
      score: anime.score,
      synonyms: anime.synonyms,
      studios: anime.studios,
      tags: anime.tags,
      sourceCount: anime.sources?.length ?? 0,
    };
    /* Boş alanlar hiç yazılmıyor: 7500 kayıtta `null` yazmak yüzlerce kilobayt
     * eder ve okuyan taraf için `undefined` ile aynı anlama gelir. */
    if (anime.popularityRank != null) record.popularityRank = anime.popularityRank;
    if (anime.malId != null) record.malId = anime.malId;
    if (anime.anilistId != null) record.anilistId = anime.anilistId;
    if (anime.poster) {
      record.poster = {
        small: anime.poster.small,
        medium: anime.poster.medium,
        large: anime.poster.large,
      };
    }
    return record;
  });
}

/**
 * Tarayıcı yükünde bulunması ZORUNLU alanlar.
 *
 * Sözleşme burada yazılı ve `npm run payload:check` bunu gerçek veriye karşı
 * sınıyor. Bir alanı yükten düşürmek onu okuyan özelliği çökertmez — sessizce
 * boşaltır; o yüzden sözleşmenin bir testi olmak zorunda.
 */
export const BROWSER_PAYLOAD_FIELDS = [
  "id", "slug", "title", "type", "episodes", "status", "season",
  "durationSeconds", "score", "synonyms", "studios", "tags", "sourceCount",
] as const;

/** Yükte kesinlikle BULUNMAMASI gerekenler; her biri ölçülmüş bir ağırlık. */
export const BROWSER_PAYLOAD_OMITTED = [
  "cover", "sources", "kitsuId", "ratingRank", "userCount",
  "titleEnglish", "titleRomaji", "titleNative",
] as const;
