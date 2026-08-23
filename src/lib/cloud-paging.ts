import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Bir kullanıcının tüm satırlarını sayfa sayfa indirir.
 *
 * Neden gerekli: PostgREST'in `max-rows` tavanı (Supabase'de varsayılan 1000)
 * aşıldığında HATA VERMEZ, ilk N satırı döndürür. Sayfalamasız bir `select`,
 * 1000'den fazla kaydı olan bir kullanıcının arşivini sessizce kırpıyordu — ve
 * her eşitlemede aynı ilk 1000 satır geldiği için eksik kalan kayıtlar o
 * cihazda bir daha hiç görünmüyordu.
 *
 * Ajan ucu (`supabase/functions/orbit-eylem/index.ts`) bu deseni zaten
 * kullanıyordu; eksik olan tarayıcı yoluydu.
 */

const SAYFA_BOYUTU = 500;

/** Bir kullanıcının makul olarak sahip olabileceğinden çok daha yüksek bir tavan. */
export const CLOUD_MAX_ROWS = 100_000;

export class CloudPagingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudPagingError";
  }
}

export async function fetchAllUserRows<Row>(
  client: SupabaseClient,
  table: string,
  columns: string,
  userId: string,
  /**
   * Sıralama sütunu. Kullanıcı içinde BENZERSİZ olmak zorunda: `range()`
   * penceresinin anlamlı olması için satır düzeninin istekler arasında sabit
   * kalması gerekiyor, sırasız bir sorguda sayfalar örtüşebilir ya da satır
   * atlayabilir.
   */
  orderColumn: string,
): Promise<Row[]> {
  const rows: Row[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .eq("user_id", userId)
      .order(orderColumn, { ascending: true })
      .range(from, from + SAYFA_BOYUTU - 1);
    if (error) throw error;

    const page = (data ?? []) as Row[];
    /* Bitişi boş sayfadan anlıyoruz, "istediğimden az geldi"den değil.
     * Sunucunun tavanı sayfa boyutumuzdan küçükse her sayfa eksik gelir ve
     * eksikliği bitiş sayması, düzelttiğimiz hatanın aynısını üretirdi. */
    if (page.length === 0) break;
    rows.push(...page);
    from += page.length;

    if (rows.length >= CLOUD_MAX_ROWS) {
      /* Sessizce kırpmak yerine düşüyoruz: eksik veriyle birleştirme yapmak,
       * yerel kayıtları uzaktakinden "daha yeni" sanıp geri yazmaya kadar
       * gidebilir. */
      throw new CloudPagingError(
        `${table} güvenli okuma sınırını (${CLOUD_MAX_ROWS.toLocaleString("tr-TR")} kayıt) aşıyor.`,
      );
    }
  }

  return rows;
}
