import assert from "node:assert/strict";
import { catalogue } from "../src/lib/catalogue";
import {
  BROWSER_PAYLOAD_FIELDS,
  BROWSER_PAYLOAD_OMITTED,
  toBrowserCatalogue,
} from "../src/lib/catalogue-payload";

/* Tarayıcı yükü sözleşmesi.
 *
 * Bu yükten bir alan düşerse okuyan özellik ÇÖKMEZ — sessizce boşalır: tür
 * grafiği boş çıkar, arama eşleşmez, poster gri kalır. Sessiz bozulmanın
 * testi olmak zorunda. */

const payload = toBrowserCatalogue(catalogue);
assert.equal(payload.length, catalogue.length, "yük her kaydı taşımalı");

for (const field of BROWSER_PAYLOAD_FIELDS) {
  const eksik = payload.filter((record) => (record as Record<string, unknown>)[field] === undefined);
  assert.equal(eksik.length, 0,
    `"${field}" alanı ${eksik.length} kayıtta eksik; bu alanı okuyan özellik sessizce boşalırdı`);
}

for (const field of BROWSER_PAYLOAD_OMITTED) {
  const kalan = payload.filter((record) => (record as Record<string, unknown>)[field] !== undefined);
  assert.equal(kalan.length, 0,
    `"${field}" yüke geri sızmış (${kalan.length} kayıt); tarayıcıda okunmuyor ve yalnız ağırlık ekliyor`);
}

/* Poster yalnız çizilen üç boyutu taşımalı. */
const posterli = payload.find((record) => record.poster);
assert.ok(posterli?.poster, "en az bir kayıtta poster bulunmalı");
assert.deepEqual(Object.keys(posterli.poster).sort(), ["large", "medium", "small"],
  "poster yalnız AnimeArtwork'ün çizdiği boyutları taşımalı");

/* `sources` yerine geçen sayı gerçekten aynı bilgiyi taşımalı. Tek tek değil
 * tamamı karşılaştırılıyor: örnek bir kayıt seçmek, kaynak sayısı bugün her
 * kayıtta 1 olduğu için hiçbir şey kanıtlamazdı. */
const uyusmayan = catalogue.filter((anime, index) => payload[index].sourceCount !== (anime.sources?.length ?? 0));
assert.equal(uyusmayan.length, 0,
  "sourceCount, sources dizisinin uzunluğunu her kayıtta birebir taşımalı");

/* Ölçülebilir kazanç. Eşik, kazancın kazara geri alınmasına karşı. */
const tam = JSON.stringify(catalogue).length;
const zayif = JSON.stringify(payload).length;
const oran = zayif / tam;
assert.ok(oran < 0.6,
  `tarayıcı yükü tam katalogun %${Math.round(oran * 100)}'i; %60'ın altında kalmalı`);

console.log(
  `Tarayıcı katalog yükü doğrulandı: ${(tam / 1048576).toFixed(2)} MB → `
  + `${(zayif / 1048576).toFixed(2)} MB (%${Math.round((1 - oran) * 100)} daha az), ${payload.length} kayıt.`,
);
