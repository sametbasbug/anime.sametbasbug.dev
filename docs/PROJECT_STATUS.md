# Rota proje durumu

Son güncelleme: 8 Ağustos 2026

Bu dosya, yeni bir çalışma oturumunda başlanacak kanonik durum özetidir. Ayrıntılı ürün sırası `ROADMAP.md`, hesap güvenlik modeli `docs/ACCOUNT_ARCHITECTURE.md` içindedir.

## Kilitli kararlar

- Geçici ürün adı: **Rota**.
- Yayın domain'i: **`anime.sametbasbug.dev`**.
- Statik yayın hedefi: **GitHub Pages**.
- İşlem e-postası göndericisi: **`Rota <giris@anime.sametbasbug.dev>`**.
- GitHub deposu: **public**.
- Kanonik GitHub deposu: **`sametbasbug/anime.sametbasbug.dev`**.
- Lisans modeli: uygulama kaynak kodu **AGPL-3.0-only**; özgün içerik, görsel kimlik ve marka unsurları korumalı; katalog verisi ODbL/DbCL koşullarında.
- Korunan içerik ve marka katmanının hak sahibi: **Samet Başbuğ**.
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
- Public depo için kod, içerik/marka ve katalog veri lisansı kapsamları ayrıldı.
- Public GitHub deposu oluşturuldu ve `main` ilk kez push edildi: `sametbasbug/anime.sametbasbug.dev`.
- GitHub Actions build + Pages deploy hattı kuruldu; `anime.sametbasbug.dev` doğrulanmış özel domain ve zorunlu HTTPS ile canlıya alındı.
- GitHub Actions'a yalnız Supabase publishable URL/key repo değişkenleri tanımlandı; service-role veya secret eklenmedi.
- Son doğrulama: `npm run check` sıfır hata/uyarı/ipucu; `npm run build` 1.123 statik sayfa.

## Açık işler

1. Domain'i Resend'de doğrula; `giris@anime.sametbasbug.dev` göndericisini, Supabase custom SMTP'yi ve üretim Auth URL'lerini yapılandır.
2. İki fiziksel cihazda giriş, birleştirme, çevrimdışı düzenleme ve silme senaryolarını doğrula. Bu turda iki şeye ayrıca bakılacak: ikinci eşitlemede gönderilen kayıt sayısının sıfıra düşmesi ve reddedilen kayıt mesajının gerçek oturumdaki görünümü.
3. Supabase Free planın duraklama/yedek sınırlarını yeniden değerlendir.

## Değişiklik sınırı

- Repo, Pages deploy hattı, özel domain ve HTTPS canlıdır; `main` push'ları Actions deploy'unu tetikler.
- Resend domain doğrulaması, özel SMTP ve Supabase üretim Auth URL yapılandırması henüz yapılmamıştır.
- `.env` içindeki Supabase public değerleri yereldir ve git tarafından yok sayılır.
- Secret/service-role anahtarı tarayıcıya veya repoya konmaz.

## Son commitler

- `c512f37` — `chore: prepare public Rota repository [skip ci]`
- `d1099a6` — `chore: ignore .claude`
- `2d4e8da` — `feat: tell partial sync apart in the header badge`
- `fede3c4` — `docs: record sync hardening and ownership in status`
- `a9f534d` — `fix: make personal list sync resilient to format and constraint errors`
