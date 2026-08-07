# Rota proje durumu

Son güncelleme: 7 Ağustos 2026

Bu dosya, yeni bir çalışma oturumunda başlanacak kanonik durum özetidir. Ayrıntılı ürün sırası `ROADMAP.md`, hesap güvenlik modeli `docs/ACCOUNT_ARCHITECTURE.md` içindedir.

## Kilitli kararlar

- Geçici ürün adı: **Rota**.
- Yayın domain'i: **`anime.sametbasbug.dev`**.
- Uygulama: Astro 7 + React 19 + strict TypeScript; statik katalog ve editoryal içerik.
- Hesap altyapısı: Supabase Auth + Postgres + sahip-kullanıcı RLS.
- Kişisel liste: local-first, geriye uyumlu v2 kayıt ve silme tombstone'ları.
- İşlem e-postası: ürün domain'i doğrulandıktan sonra Resend custom SMTP.

## Tamamlananlar

- 900 yapımlık aranabilir katalog, 900 detay sayfası, tür/stüdyo keşfi ve benzer yapım yolları.
- Dört durumlu kişisel liste; bölüm ilerlemesi, puan ve kişisel not.
- Sekiz yayımlanmış özgün Türkçe editoryal profil; taslak ve kontrol durumları ayrılmış içerik akışı.
- Şifresiz magic-link hesabı, profil ve liste görünürlüğü tercihleri.
- Equinox organizasyonu altında Frankfurt bölgesinde Supabase Free `Rota` projesi.
- İki RLS tablosu ve yedi sahip-kullanıcı politikası içeren migration.
- Magic-link, profil yazma ve bir liste kaydını boş ikinci tarayıcı profiline indirme testi.
- Son doğrulama: `npm run check` sıfır hata/uyarı/ipucu; `npm run build` 1.123 statik sayfa.

## Açık işler

1. `anime.sametbasbug.dev` için yayın hedefini seç ve DNS kaydını oluştur.
2. Domain'i Resend'de doğrula; Supabase custom SMTP ve üretim Auth URL'lerini yapılandır.
3. İki fiziksel cihazda giriş, birleştirme, çevrimdışı düzenleme ve silme senaryolarını doğrula.
4. Yayından önce Supabase Free planın duraklama/yedek sınırlarını yeniden değerlendir.

## Değişiklik sınırı

- Domain seçilmiştir; **DNS, deploy, push ve SMTP yapılandırması henüz yapılmamıştır**.
- `.env` içindeki Supabase public değerleri yereldir ve git tarafından yok sayılır.
- Secret/service-role anahtarı tarayıcıya veya repoya konmaz.

## Son commitler

- `6acff41` — `fix: verify Supabase accounts and refresh sync count`
- `bcd311f` — `feat: build Rota catalogue and local-first accounts`
