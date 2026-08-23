/**
 * Supabase'in `max-rows` tavanını taklit eden sahte `select` zinciri.
 *
 * Tavan bilerek küçük (varsayılan 3): gerçek sunucudaki 1000'i taklit etmek
 * için testin 1000'den fazla satır kurması gerekirdi ve sınanan şey satır
 * sayısı değil, sayfalamanın kendisi. Tavanın istenen pencereden küçük olması
 * ayrıca "istediğimden az geldi, demek ki bitti" varsayımını da yakalıyor —
 * düzeltilen hatanın tam olarak bu varsayım olması tesadüf değil.
 */
type Row = Record<string, unknown>;
type RowSource = unknown[] | (() => unknown[]);

function sortRows(rows: unknown[], column: string): Row[] {
  return [...(rows as Row[])].sort(
    (a, b) => String(a[column] ?? "").localeCompare(String(b[column] ?? ""), "tr-TR"),
  );
}

export function pagedSelect(rows: RowSource, serverMaxRows = 3) {
  /* Sabit bir satır kümesi bir kez sıralanıyor. Her istekte yeniden sıralamak
   * doğru sonucu verirdi ama sayfa başına tüm kümeyi gezmek, tavan testinin
   * kendisini dakikalara çıkarıyor. */
  const cache = new Map<string, Row[]>();

  return () => ({
    eq: () => ({
      /* Sıralama gerçekten uygulanıyor: `range()` penceresinin anlamlı olması
       * sabit bir satır düzenine bağlı ve sırasız bir sahte, üretimde olmayan
       * bir güvenceyi taklit ederdi. */
      order: (column: string) => ({
        async range(from: number, to: number) {
          let sorted: Row[];
          if (typeof rows === "function") {
            sorted = sortRows(rows(), column);
          } else {
            sorted = cache.get(column) ?? sortRows(rows, column);
            cache.set(column, sorted);
          }
          const istenen = Math.max(0, to - from + 1);
          return { data: sorted.slice(from, from + Math.min(istenen, serverMaxRows)), error: null };
        },
      }),
    }),
  });
}
