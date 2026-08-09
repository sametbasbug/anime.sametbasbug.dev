# Hesap ve kalıcı veri mimarisi

İlk karar tarihi: 7 Ağustos 2026

Kimlik doğrulama güncellemesi: 9 Ağustos 2026

## Karar

Equinox Rota, hesap ve kullanıcı verisi için **Supabase Auth + Postgres + Row Level Security** kullanır. Kimlik doğrulama, Google Identity Services resmî düğmesinden alınan nonce-korumalı ID token'ının Supabase tarafından doğrulanmasıyla yapılır; kullanıcı Supabase alan adına yönlendirilmez. Discord, e-posta/parola ve e-posta magic-link alternatifleri sunulmaz. Hesap açmak istemeyen kullanıcı için local-first kullanım değişmeden devam eder.

İlk üretim doğrulaması şifresiz e-posta bağlantıları ve Resend özel SMTP ile tamamlandı. Bu akış teknik olarak çalışsa da her girişin e-posta kotası tüketmesi nedeniyle kaldırıldı. Google OAuth geçişinin ardından Supabase e-posta sağlayıcısı, özel SMTP ve CAPTCHA kapatıldı; Rota'ya özel Resend anahtarı ile Turnstile bileşeni silindi.

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
4. İlk girişte yerel ve bulut kayıtları `client_updated_at` üzerinden birleştirilir; daha yeni değişiklik korunur. Karşılaştırma metin olarak değil anlık değer olarak yapılır: PostgREST timestamptz'i `+00:00` ofsetiyle döndürürken yerel kayıt `Z` biçimindedir ve iki biçim metin olarak asla eşit görünmez.
5. Silmeler fiziksel olarak hemen kaldırılmaz. `deleted_at` tombstone'u çevrimdışı cihazların silinen kaydı geri getirmesini önler.
6. İndirilen kayıtlar gönderimden önce yerele yazılır; gönderim yarıda kesilse bile uzaktan alınan değişiklik kaybolmaz.
7. Gönderim 200'lük parçalara bölünür. Sunucu bir parçayı veri (22xxx) veya kısıt (23xxx) hatasıyla reddederse satırlar tek tek denenir; yalnız bozuk kayıt elenir, cihazda korunur ve hesap ekranında bildirilir. Ağ, JWT ve RLS hataları isteğin tamamını ilgilendirdiği için satır satır yeniden denenmez.
8. Senkronizasyon hatası yerel yazmayı engellemez; daha sonra yeniden denenebilir.

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

## Google OAuth

- Google Auth Platform uygulaması external ve production durumundadır.
- Supabase Google sağlayıcısı yalnız `email` ve `profile` kapsamlarıyla kullanılır; dönüş Supabase Auth callback'i üzerinden `/hesap` sayfasına yapılır.
- Hesap ekranı yalnız Google ile giriş sunar; hesapsız yerel kullanım korunur.
- Eski iki magic-link hesabı ve verisi taşınmaz; bu temiz başlangıç ürün sahibi tarafından onaylanmıştır.
- Nyx hesabıyla localhost ve production üzerinde gerçek OAuth onayı, oturum açma ve yerel liste birleştirme testi geçmiştir.

Google OAuth geçişi katalog ve editoryal veri modelini veya mevcut RLS politikalarını değiştirmez. Gelecekte zorunlu işlem e-postası gerekirse giriş akışından bağımsız değerlendirilir.

## Kurulu geliştirme ortamı

- Supabase organizasyonu: `Equinox`; proje: `Equinox Rota`.
- Plan ve bölge: Free, Central EU (Frankfurt).
- Data API açık; yeni tabloları otomatik yayımlama kapalı; otomatik RLS açık.
- Migration uygulanmış ve doğrulanmıştır: iki RLS tablosu, yedi sahip-kullanıcı politikası.
- Auth site URL'si `https://anime.sametbasbug.dev`; production `/hesap` ile `localhost` ve `127.0.0.1` hesap dönüş adresleri izinlidir.
- Google OAuth, profil yazma ve yerel liste birleştirme production üzerinde doğrulanmıştır; tekrarlanan eşitleme sıfır kayıt göndermiştir.
- İki fiziksel cihazda production girişi tamamlanmış ve kişisel liste sayısının iki cihazda eşit olduğu doğrulanmıştır. Çevrimdışı düzenleme ve silme senaryolarının Google OAuth geçişinden sonra yeniden doğrulanması beklenir.
- Supabase e-posta sağlayıcısı, özel SMTP ve CAPTCHA kapalıdır. Rota'ya özel Resend API anahtarı ile Cloudflare Turnstile bileşeni silinmiştir; ortak `sametbasbug.dev` alan adına ve Orbit anahtarına dokunulmamıştır.

## Ücretsiz plan sınırı

Free plan geliştirme ve soft alpha için yeterlidir. Düşük aktivitede otomatik duraklama ve otomatik yedek eksikliği nedeniyle kesintisiz public üretim için yükseltme kararı yayın aşamasında yeniden değerlendirilir. Ücretli plana otomatik geçilmez.
