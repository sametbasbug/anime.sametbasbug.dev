# Hesap ve kalıcı veri mimarisi

Karar tarihi: 7 Ağustos 2026

## Karar

Rota, hesap ve kullanıcı verisi için **Supabase Auth + Postgres + Row Level Security** kullanır. Şifresiz e-posta bağlantıları Supabase Auth üzerinden yürür; public kullanımdaki işlem e-postaları için özel SMTP sağlayıcısı olarak Resend tercih edilir.

Bu karar katalog veya editoryal içeriği veritabanına taşımaz. Bunlar sürüm kontrollü statik veri olarak kalır. Supabase yalnızca kullanıcıya ait değişken veriyi saklar:

- profil adı ve liste görünürlüğü tercihi;
- anime durumu, bölüm ilerlemesi, kişisel puan ve özel not;
- cihazlar arası silme işlemlerini taşıyan tombstone kayıtları.

## Güven sınırı

- Tarayıcıya yalnız Supabase URL'si ve **publishable** anahtar verilir. Secret/service-role anahtarı istemciye konmaz.
- `profiles` ve `personal_list_entries` tablolarında RLS zorunludur.
- Temel tablolar yalnız sahip kullanıcı tarafından okunabilir ve değiştirilebilir.
- `PUBLIC` veya `UNLISTED` tercihi temel tablolara anonim erişim açmaz. Gelecekte paylaşım ekranı yapılırsa kişisel notu dışarıda bırakan ayrı, sanitize edilmiş bir okuma yüzeyi gerekir.
- Hesap isteğe bağlıdır; giriş yapmayan kullanıcının listesi yalnız tarayıcıda çalışır.

## Local-first senkronizasyon

1. Her değişiklik önce `rota.personal-list.v1` yerel kaydına yazılır.
2. Yerel kayıt biçimi v2'ye yükseltilmiştir; eski v1 kayıtları otomatik okunur.
3. Giriş yapılmışsa değişiklikler kısa bir debounce sonrasında buluta gönderilir.
4. İlk girişte yerel ve bulut kayıtları `client_updated_at` üzerinden birleştirilir; daha yeni değişiklik korunur.
5. Silmeler fiziksel olarak hemen kaldırılmaz. `deleted_at` tombstone'u çevrimdışı cihazların silinen kaydı geri getirmesini önler.
6. Senkronizasyon hatası yerel yazmayı engellemez; daha sonra yeniden denenebilir.

Bu ilk senkronizasyon modeli cihaz saatine dayanır. Ürün geniş kullanıcı kitlesine açılmadan önce saat sapması telemetrisi incelenmeli; gerekirse sunucu revizyonu/optimistic concurrency protokolüne geçilmelidir.

## Yapılandırma

```bash
cp .env.example .env
```

Gerekli public değerler:

```text
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Migration dosyası: `supabase/migrations/202608070001_accounts_and_personal_lists.sql`.

## Kurulu geliştirme ortamı

- Supabase organizasyonu: `Equinox`; proje: `Rota`.
- Plan ve bölge: Free, Central EU (Frankfurt).
- Data API açık; yeni tabloları otomatik yayımlama kapalı; otomatik RLS açık.
- Migration uygulanmış ve doğrulanmıştır: iki RLS tablosu, yedi sahip-kullanıcı politikası.
- Auth site URL'si `http://localhost:4321`; `localhost` ve `127.0.0.1` hesap dönüş adresleri izinlidir.
- Magic-link, profil yazma ve bir liste kaydının ikinci bağımsız tarayıcı profiline indirilmesi gerçek servis üzerinde doğrulanmıştır.
- Resend hesabı hazırdır fakat doğrulanmış domain yoktur. Ürün domain'i kesinleşmeden DNS veya özel SMTP yapılandırılmaz.

## Ücretsiz plan sınırı

Free plan geliştirme ve soft alpha için yeterlidir. Düşük aktivitede otomatik duraklama ve otomatik yedek eksikliği nedeniyle kesintisiz public üretim için yükseltme kararı yayın aşamasında yeniden değerlendirilir. Ücretli plana otomatik geçilmez.
