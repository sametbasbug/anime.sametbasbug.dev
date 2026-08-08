# Hesap ve kalıcı veri mimarisi

İlk karar tarihi: 7 Ağustos 2026

Kimlik doğrulama güncellemesi: 8 Ağustos 2026

## Karar

Rota, hesap ve kullanıcı verisi için **Supabase Auth + Postgres + Row Level Security** kullanır. Kalıcı kimlik doğrulama yöntemi yalnız **Google OAuth** olacaktır. Discord, e-posta/parola ve e-posta magic-link alternatifleri sunulmayacaktır. Hesap açmak istemeyen kullanıcı için local-first kullanım değişmeden devam eder.

İlk üretim doğrulaması şifresiz e-posta bağlantıları ve Resend özel SMTP ile tamamlandı. Bu akış teknik olarak çalışsa da Resend Free'nin günlük 100 e-posta sınırı, her girişin kota tüketmesi ve dağıtık kötüye kullanımın yalnız CAPTCHA/oran sınırıyla tamamen engellenememesi nedeniyle kalıcı public giriş yöntemi olmaya uygun bulunmadı. Magic-link sistemi Google OAuth geçişi tamamlanana kadar geçici mevcut durumdur; yeni ürün kararı onu geçersiz kılar.

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
PUBLIC_TURNSTILE_SITE_KEY=
```

Migration dosyası: `supabase/migrations/202608070001_accounts_and_personal_lists.sql`.

## Google OAuth geçişi

Geçiş aşağıdaki veri güvenliği sırasıyla yapılır:

1. Google OAuth istemcisi ve Supabase Google sağlayıcısı production/localhost dönüş adresleriyle yapılandırılır.
2. Hesap ekranı yalnız Google ile giriş sunacak biçimde değiştirilir; hesapsız yerel kullanım korunur.
3. Mevcut magic-link hesabının Google kimliğiyle aynı kullanıcıya güvenli bağlandığı veya verisinin açık bir taşıma adımıyla korunduğu gerçek hesapta doğrulanır.
4. Aynı yerel listenin iki fiziksel cihazda indirilmesi, düzenlenmesi ve silinmesi yeniden test edilir.
5. Bu doğrulamalar geçmeden e-posta sağlayıcısı kapatılmaz. Geçtikten sonra Supabase e-posta girişi, magic-link arayüzü ve yalnız bu akış için kullanılan Turnstile kaldırılır.

Resend yapılandırması geçiş sırasında korunur; gelecekte zorunlu işlem e-postası ihtiyacı doğarsa giriş kotasından bağımsız değerlendirilir. Google OAuth'a geçiş, katalog ve editoryal veri modelini veya mevcut RLS politikalarını değiştirmez.

## Kurulu geliştirme ortamı

- Supabase organizasyonu: `Equinox`; proje: `Rota`.
- Plan ve bölge: Free, Central EU (Frankfurt).
- Data API açık; yeni tabloları otomatik yayımlama kapalı; otomatik RLS açık.
- Migration uygulanmış ve doğrulanmıştır: iki RLS tablosu, yedi sahip-kullanıcı politikası.
- Auth site URL'si `https://anime.sametbasbug.dev`; production `/hesap` ile `localhost` ve `127.0.0.1` hesap dönüş adresleri izinlidir.
- Magic-link, profil yazma ve bir liste kaydının ikinci bağımsız tarayıcı profiline indirilmesi gerçek servis üzerinde doğrulanmıştır.
- İki fiziksel cihazda production girişi tamamlanmış ve kişisel liste sayısının iki cihazda eşit olduğu doğrulanmıştır. Çevrimdışı düzenleme ve silme senaryolarının Google OAuth geçişinden sonra yeniden doğrulanması beklenir.
- Yayın domain'i `anime.sametbasbug.dev`; işlem e-postası göndericisi `Rota <giris@sametbasbug.dev>` olarak yapılandırılmıştır. Resend'de doğrulanmış kök domain, yalnız gönderim yetkili ayrı anahtar ve Supabase özel SMTP kullanılır; anahtar değeri repoda tutulmaz.
- Gerçek magic-link teslimatı ve production oturum açma doğrulanmıştır. SPF, DKIM ve DMARC geçmiştir; `Rota giriş bağlantın` başlıklı Türkçe şablon kaydedilmiştir.
- Geçici magic-link akışının Auth giriş ve kayıt endpoint'lerinde Cloudflare Turnstile zorunludur. Supabase'in sunucu tarafı proje kotası saatte en fazla 5 e-posta, IP başına kayıt/giriş kotası 5 dakikada 10 istek olarak ayarlanmıştır. Aynı hedefe yeniden gönderim için Supabase'in sunucu bekleme süresine ek olarak arayüzde 60 saniyelik bekleme gösterilir. Bunlar kötüye kullanımı azaltır; günlük Resend kotasını sürdürülebilir hâle getiren nihai çözüm değildir.
- Turnstile secret yalnız Cloudflare ve Supabase yapılandırmasında tutulur. Tarayıcıya ve GitHub Actions'a yalnız public site key verilir.

## Ücretsiz plan sınırı

Free plan geliştirme ve soft alpha için yeterlidir. Düşük aktivitede otomatik duraklama ve otomatik yedek eksikliği nedeniyle kesintisiz public üretim için yükseltme kararı yayın aşamasında yeniden değerlendirilir. Ücretli plana otomatik geçilmez.
