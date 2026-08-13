import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Orbit girişinin dışarıyla eşleşmesi gereken kısımlarını korur.
 *
 * Buradaki değerlerin hiçbiri bize ait değil: karşılıkları Supabase'in
 * sağlayıcı ayarında ve izinli dönüş adresleri listesinde duruyor. Yazım hatası
 * derlemede değil, kullanıcı düğmeye bastığında ortaya çıkar — ve o an kimse
 * geliştirme oturumunda değildir. Bu dosya o sessizliği bozuyor.
 */

const accountExperience = readFileSync(
  new URL("../src/components/AccountExperience.tsx", import.meta.url),
  "utf8",
);
const supabaseClient = readFileSync(
  new URL("../src/lib/supabase.ts", import.meta.url),
  "utf8",
);
const orbitManagedNamesMigration = readFileSync(
  new URL("../supabase/migrations/202608130001_orbit_managed_display_names.sql", import.meta.url),
  "utf8",
);

/* 1. Sağlayıcı adı. Supabase'de tanımlayıcı `orbit`, SDK'da kullanılan biçim
   `custom:orbit`. Tek harf farkı Supabase'in "sağlayıcı bulunamadı" demesine
   yetiyor. */
assert.match(
  accountExperience,
  /const ORBIT_PROVIDER = "custom:orbit";/u,
  "Sağlayıcı adı `custom:orbit` olmalı; Supabase kaydı bu adla aranıyor.",
);

/* 2. Dönüş adresi. Supabase izinli listesinde `/hesap` yolu kayıtlı; başka bir
   yol listede olmadığı için Supabase oraya dönmez, kullanıcıyı sessizce site
   köküne atar. */
assert.match(
  accountExperience,
  /new URL\("\/hesap", window\.location\.origin\)/u,
  "Dönüş adresi `/hesap` olmalı; Supabase izinli dönüş listesi bu yolu taşıyor.",
);

/* 3. Akış biçimi. `pkce` dönüşü `?code=` ile alıyor ve `detectSessionInUrl`
   onu oturuma çeviriyor. İkisinden biri kapanırsa giriş, hata vermeden
   yarım kalır: kullanıcı siteye döner ama oturum açılmamış olur. */
assert.match(supabaseClient, /flowType:\s*"pkce"/u, "Akış `pkce` olmalı.");
assert.match(
  supabaseClient,
  /detectSessionInUrl:\s*true/u,
  "`detectSessionInUrl` açık olmalı; dönüşteki kodu oturuma çeviren bu.",
);

/* 4. Google girişi geri sızmasın. Kaldırılması bir karardı: iki kapı açık
   kalırsa Orbit'i hiç görmeden hesap açan bir yol doğar.

   Yorumlar ayıklanıyor, çünkü dosya eski Google akışını bilerek anlatıyor —
   neden kaldırıldığını yazmak, kalıntı bırakmak değil. Bu ayrım testin ilk
   halinde yoktu ve test kendi yorumumu hata sandı. */
const kodSatirlari = accountExperience
  .replace(/\/\*[\s\S]*?\*\//gu, "")
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("//"))
  .join("\n");

for (const iz of ["signInWithIdToken", "accounts.google.com", "PUBLIC_GOOGLE_CLIENT_ID"]) {
  assert.equal(
    kodSatirlari.includes(iz),
    false,
    `Google giriş kalıntısı geri gelmiş: ${iz}`,
  );
}

/* 5. Görünen adın sahibi Orbit. Rota'da ikinci bir ad düzenleyicisi veya
   display_name kolonuna istemci yazımı kalırsa iki kimlik kısa sürede ayrışır. */
assert.equal(
  /display_name:\s*next\.display_name/u.test(kodSatirlari),
  false,
  "Rota istemcisi görünen adı doğrudan güncellememeli.",
);
assert.equal(
  /Görünen ad\s*\n\s*<input/u.test(accountExperience),
  false,
  "Hesap ekranında görünen ad giriş alanı bulunmamalı.",
);
assert.match(accountExperience, /GÖRÜNEN AD · ORBIT'TEN GELİR/u);
assert.match(orbitManagedNamesMigration, /after update of raw_user_meta_data on auth\.users/u);
assert.match(orbitManagedNamesMigration, /revoke update \(display_name\) on public\.profiles from authenticated/u);

/* 6. Düğme metni CSS ile büyütülmesin. Sayfa `lang="tr"` ve tarayıcı Türkçe
   kuralıyla büyütüyor: "Orbit" ekranda "ORBİT" oluyor. */
const globalCss = readFileSync(
  new URL("../src/styles/global.css", import.meta.url),
  "utf8",
);
const orbitButtonRule = globalCss
  .split("\n")
  .find((line) => line.startsWith(".account-orbit {"));
assert.ok(orbitButtonRule, ".account-orbit kuralı bulunamadı.");
assert.equal(
  orbitButtonRule.includes("text-transform: uppercase"),
  false,
  "Giriş düğmesi büyütülmemeli: Türkçe kuralıyla \"Orbit\" → \"ORBİT\" oluyor.",
);

console.log("Orbit girişinin dış yapılandırmayla eşleşen kısımları doğrulandı.");
