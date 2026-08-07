# Rota proje durumu

Son güncelleme: 7 Ağustos 2026

Bu dosya, yeni bir çalışma oturumunda başlanacak kanonik durum özetidir. Ayrıntılı ürün sırası `ROADMAP.md`, hesap güvenlik modeli `docs/ACCOUNT_ARCHITECTURE.md` içindedir.

## Kilitli kararlar

- Geçici ürün adı: **Rota**.
- Yayın domain'i: **`anime.sametbasbug.dev`**.
- Statik yayın hedefi: **GitHub Pages**.
- İşlem e-postası göndericisi: **`Rota <giris@anime.sametbasbug.dev>`**.
- Uygulama: Astro 7 + React 19 + strict TypeScript; statik katalog ve editoryal içerik.
- Hesap altyapısı: Supabase Auth + Postgres + sahip-kullanıcı RLS.
- Kişisel liste: local-first, geriye uyumlu v2 kayıt ve silme tombstone'ları.
- Proje sahipliği: Nyx. Hemera 7 Ağustos 2026'dan itibaren teknik tarafta dahildir; ürün, içerik ve tasarımda son söz Nyx'tedir.
- İşlem e-postası: `anime.sametbasbug.dev` Resend'de doğrulandıktan sonra custom SMTP.

## Tamamlananlar

- 900 yapımlık aranabilir katalog, 900 detay sayfası, tür/stüdyo keşfi ve benzer yapım yolları.
- Dört durumlu kişisel liste; bölüm ilerlemesi, puan ve kişisel not.
- Sekiz yayımlanmış özgün Türkçe editoryal profil; taslak ve kontrol durumları ayrılmış içerik akışı.
- Şifresiz magic-link hesabı, profil ve liste görünürlüğü tercihleri.
- Equinox organizasyonu altında Frankfurt bölgesinde Supabase Free `Rota` projesi.
- İki RLS tablosu ve yedi sahip-kullanıcı politikası içeren migration.
- Magic-link, profil yazma ve bir liste kaydını boş ikinci tarayıcı profiline indirme testi.
- Senkronizasyon sağlamlaştırması: sürümler metin yerine anlık değer olarak karşılaştırılır, gönderim 200'lük parçalara bölünür, sunucunun reddettiği satır yalıtılıp cihazda korunur, indirilen kayıtlar gönderimden önce yazılır.
- Başlık rozetinde ayrı `partial` durumu: kısmi red artık "eşitlendi" gibi görünmüyor, kehribar noktayla ve reddedilen kayıt sayısıyla bildiriliyor.
- Son doğrulama: `npm run check` sıfır hata/uyarı/ipucu; `npm run build` 1.123 statik sayfa.

## Açık işler

1. Repo görünürlüğünü doğrula; GitHub remote ve ilk push'u açık onayla oluştur.
2. GitHub Actions tabanlı Astro build ve GitHub Pages yayınını yapılandır.
3. `anime.sametbasbug.dev` DNS kaydını GitHub Pages'e bağla.
4. Domain'i Resend'de doğrula; `giris@anime.sametbasbug.dev` göndericisini, Supabase custom SMTP'yi ve üretim Auth URL'lerini yapılandır.
5. İki fiziksel cihazda giriş, birleştirme, çevrimdışı düzenleme ve silme senaryolarını doğrula. Bu turda iki şeye ayrıca bakılacak: ikinci eşitlemede gönderilen kayıt sayısının sıfıra düşmesi ve reddedilen kayıt mesajının gerçek oturumdaki görünümü.
6. Yayından önce Supabase Free planın duraklama/yedek sınırlarını yeniden değerlendir.

## Değişiklik sınırı

- Hosting, domain ve gönderici seçilmiştir; **DNS, deploy, push ve SMTP yapılandırması henüz yapılmamıştır**.
- Repo görünürlüğü ayrıca doğrulanmadan kaynak kodu public yapılmaz.
- `.env` içindeki Supabase public değerleri yereldir ve git tarafından yok sayılır.
- Secret/service-role anahtarı tarayıcıya veya repoya konmaz.

## Son commitler

- `a9f534d` — `fix: make personal list sync resilient to format and constraint errors`
- `4c400e6` — `docs: include Hemera in Rota`
- `f5f5ea9` — `docs: lock Rota publication decisions`
- `2da6a78` — `docs: record Rota status and public domain`
