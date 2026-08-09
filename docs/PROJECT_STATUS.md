# Equinox Rota proje durumu

Son güncelleme: 9 Ağustos 2026

Bu dosya, yeni bir çalışma oturumunda başlanacak kanonik durum özetidir. Ayrıntılı ürün sırası `ROADMAP.md`, hesap güvenlik modeli `docs/ACCOUNT_ARCHITECTURE.md` içindedir.

## Kilitli kararlar

- Kalıcı proje adı: **Equinox Rota**; site imzası: **Rota by Equinox**.
- Yayın domain'i: **`anime.sametbasbug.dev`**.
- Statik yayın hedefi: **GitHub Pages**.
- GitHub deposu: **public**.
- Kanonik GitHub deposu: **`sametbasbug/anime.sametbasbug.dev`**.
- Lisans modeli: uygulama kaynak kodu **AGPL-3.0-only**; özgün içerik, görsel kimlik ve marka unsurları korumalı; katalog verisi ODbL/DbCL koşullarında.
- Korunan içerik ve marka katmanının hak sahibi: **Samet Başbuğ**.
- Uygulama: Astro 7 + React 19 + strict TypeScript; statik katalog ve editoryal içerik.
- Hesap altyapısı: Supabase Auth + Postgres + sahip-kullanıcı RLS.
- Giriş yöntemi: Google Identity Services resmî düğmesi ve nonce-korumalı Supabase ID-token doğrulaması; Discord, e-posta/parola ve magic-link sunulmaz. Hesapsız local-first kullanım korunur.
- Kişisel liste: local-first, geriye uyumlu v2 kayıt ve silme tombstone'ları.
- Proje sahipliği: Nyx. Hemera 7 Ağustos 2026'dan itibaren teknik tarafta dahildir; ürün, içerik ve tasarımda son söz Nyx'tedir.

## Tamamlananlar

- 900 yapımlık aranabilir katalog, 900 detay sayfası, tür/stüdyo keşfi ve benzer yapım yolları.
- Dört durumlu kişisel liste; bölüm ilerlemesi, puan ve kişisel not.
- Sekiz yayımlanmış özgün Türkçe editoryal profil; taslak ve kontrol durumları ayrılmış içerik akışı.
- Google OAuth hesabı, profil ve liste görünürlüğü tercihleri.
- Equinox organizasyonu altında Frankfurt bölgesinde Supabase Free `Equinox Rota` projesi.
- İki RLS tablosu ve yedi sahip-kullanıcı politikası içeren migration.
- Google OAuth, profil yazma ve yerel liste birleştirme testi.
- Senkronizasyon sağlamlaştırması: sürümler metin yerine anlık değer olarak karşılaştırılır, gönderim 200'lük parçalara bölünür, sunucunun reddettiği satır yalıtılıp cihazda korunur, indirilen kayıtlar gönderimden önce yazılır.
- Başlık rozetinde ayrı `partial` durumu: kısmi red artık "eşitlendi" gibi görünmüyor, kehribar noktayla ve reddedilen kayıt sayısıyla bildiriliyor.
- Public depo için kod, içerik/marka ve katalog veri lisansı kapsamları ayrıldı.
- Public GitHub deposu oluşturuldu ve `main` ilk kez push edildi: `sametbasbug/anime.sametbasbug.dev`.
- GitHub Actions build + Pages deploy hattı kuruldu; `anime.sametbasbug.dev` doğrulanmış özel domain ve zorunlu HTTPS ile canlıya alındı.
- GitHub Actions'a Supabase publishable URL/key ve public Google web istemci kimliği repo değişkenleri tanımlandı; service-role veya başka secret eklenmedi.
- Supabase production Site URL ve `/hesap` dönüş adresi yapılandırıldı; yerel geliştirme dönüş adresleri korundu.
- Google Cloud projesi, external production OAuth uygulaması ve Supabase Google sağlayıcısı yapılandırıldı; kullanıcı destek ve geliştirici iletişim adresi Nyx e-postasıdır.
- Nyx hesabıyla localhost ve production üzerinde gerçek Google onayı, oturum açma ve yerel liste birleştirme testi geçti. Tekrarlanan eşitleme sıfır kayıt gönderdi. Eski iki magic-link hesabının aktarılmaması ürün sahibi tarafından kabul edildi.
- Supabase e-posta sağlayıcısı, özel SMTP ve CAPTCHA kapatıldı. Rota'ya özel Resend anahtarı, Cloudflare Turnstile bileşeni ve GitHub Pages değişkeni kaldırıldı; Orbit anahtarı ile ortak alan adı korundu.
- İki fiziksel cihazda production girişi tamamlandı ve kişisel liste sayısının iki cihazda aynı olduğu doğrulandı.
- Google ile giriş arayüzü masaüstü ve 390 px mobil görünümde doğrulandı.
- Google OAuth istemcisine production ve localhost JavaScript kökenleri eklendi; istemci **Equinox Rota web** olarak adlandırıldı. Giriş, kullanıcıyı Supabase alan adına yönlendirmeyen ID-token akışına geçirildi.
- Gizlilik politikası ve kullanım koşulları yayımlanmak üzere eklendi; e-posta adreslerinin diğer kullanıcılara gösterilmediği açıklandı.
- Son doğrulama: `npm run check` sıfır hata/uyarı/ipucu; `npm run build` 1.125 statik sayfa.

## Açık işler

1. Google OAuth ile iki fiziksel cihazda birleştirme, çevrimdışı düzenleme ve silme senaryolarını doğrula. Kısmi red bildiriminin gerçek oturumdaki görünümünü ayrıca kontrol et.
2. Supabase Free planın duraklama/yedek sınırlarını yeniden değerlendir.

## Değişiklik sınırı

- Repo, Pages deploy hattı, özel domain ve HTTPS canlıdır; `main` push'ları Actions deploy'unu tetikler.
- Supabase üretim Auth URL yapılandırması canlıdır; Google OAuth istemci sırrı yalnız Google Cloud ve Supabase içinde tutulur.
- `.env` içindeki Supabase public değerleri yereldir ve git tarafından yok sayılır.
- Secret/service-role anahtarı tarayıcıya veya repoya konmaz.

## Son commitler

- `072756f` — `fix: restore account form button layout`
- `76bc25a` — `feat: protect magic-link emails from abuse`
- `217eda8` — `docs: record production auth and SMTP setup`
- `c512f37` — `chore: prepare public Rota repository [skip ci]`
- `d1099a6` — `chore: ignore .claude`
- `2d4e8da` — `feat: tell partial sync apart in the header badge`
- `fede3c4` — `docs: record sync hardening and ownership in status`
- `a9f534d` — `fix: make personal list sync resilient to format and constraint errors`
