/* Aynı `Idempotency-Key` ile ikinci kez gelen bir isteğin ne olduğuna karar
 * verir: tekrar mı, çakışma mı, yoksa terk edilmiş bir rezervasyon mu.
 *
 * Karar veritabanı çağrılarından ayrı duruyor çünkü asıl incelik burada ve
 * burası sınanabilir olmalı. `index.ts` yalnız satırı getirip kararı uyguluyor.
 */

/* Terk edilmiş rezervasyonun devralınma eşiği.
 *
 * Supabase Edge Function'ının azami çalışma süresinden uzun olmak ZORUNDA:
 * kısa olsaydı, hâlâ çalışan bir isteğin anahtarı ikinci bir istek tarafından
 * devralınır ve tekrar koruması tam da korumaya çalıştığı şeyi üretirdi. */
export const REZERVASYON_ASIM_MS = 120_000;

export interface RezervasyonSatiri {
  input_digest: string;
  output: unknown;
  started_at: string;
}

export type RezervasyonKarari =
  /** Rezervasyon terk edilmiş; devralıp işi yapabiliriz. */
  | { karar: 'devral' }
  /** İş zaten yapılmış; ilk çalışmanın cevabı dönmeli. */
  | { karar: 'tekrar'; output: unknown }
  | { karar: 'red'; status: number; mesaj: string };

export function rezervasyonKarari(
  satir: RezervasyonSatiri,
  inputDigest: string,
  now: number,
): RezervasyonKarari {
  /* Aynı anahtar FARKLI gövdeyle geldi: bu bir tekrar değil, çakışma. Sessizce
   * ilk cevabı döndürmek, ajanın yaptığını sandığı işin hiç yapılmaması
   * olurdu. */
  if (satir.input_digest !== inputDigest) {
    return { karar: 'red', status: 409, mesaj: 'aynı Idempotency-Key farklı bir istekle kullanıldı' };
  }

  /* Çıktı varsa iş bitmiş. */
  if (satir.output !== null && satir.output !== undefined) {
    return { karar: 'tekrar', output: satir.output };
  }

  /* Çıktı yok: ya ilk çalışma hâlâ sürüyor ya da ortada düşmüş. İkisini ancak
   * geçen süre ayırt ediyor. */
  const started = Date.parse(satir.started_at);
  if (!Number.isFinite(started)) {
    /* Okunamayan bir zaman damgası devralma kararına temel olamaz; devralmak
     * çift yazma riski taşıyor, reddetmek yalnız gecikme. */
    return { karar: 'red', status: 409, mesaj: 'aynı Idempotency-Key ile başlayan işlem sürüyor' };
  }
  if (now - started < REZERVASYON_ASIM_MS) {
    return { karar: 'red', status: 409, mesaj: 'aynı Idempotency-Key ile başlayan işlem sürüyor' };
  }
  return { karar: 'devral' };
}
