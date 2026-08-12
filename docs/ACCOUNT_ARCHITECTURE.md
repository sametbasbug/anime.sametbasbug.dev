# Hesap ve kalıcı veri mimarisi

İlk karar tarihi: 7 Ağustos 2026

Kimlik doğrulama güncellemesi: 12 Ağustos 2026 (Google kaldırıldı, Orbit geldi)

## Karar

Equinox Rota, hesap ve kullanıcı verisi için **Supabase Auth + Postgres + Row Level Security** kullanır. Bu değişmedi.

Değişen kimliğin nereden geldiği: **giriş artık Equinox Orbit üzerinden.** Orbit,
Supabase'de `custom:orbit` adlı bir OIDC sağlayıcısı olarak kayıtlı; site tek bir
`signInWithOAuth({ provider: 'custom:orbit' })` çağrısı yapıyor, tarayıcı Orbit'e
gidiyor, kullanıcı orada onay veriyor ve `/hesap` adresine dönüyor. Google,
e-posta/parola, magic-link ve Discord sunulmaz. Hesap açmak istemeyen kullanıcı
için local-first kullanım değişmeden devam eder.

Bunun Rota tarafındaki maliyeti bilerek küçük tutuldu: RLS politikaları,
`profiles`, `personal_list_entries` ve `cloud-sync.ts` **hiç değişmedi**. Supabase
Auth bırakılmadı; yalnız kimliği getiren sağlayıcı değişti.

Kimlik yönteminin geçmişi, tekrar edilmemesi için duruyor: ilk üretim
doğrulaması şifresiz e-posta bağlantıları ve Resend özel SMTP ile yapıldı; her
girişin e-posta kotası tüketmesi nedeniyle kaldırıldı. Ardından Google Identity
Services tek-dokunuş akışı geldi (`signInWithIdToken`, nonce korumalı). O da
12 Ağustos 2026'da kaldırıldı — geçiş penceresi bırakılmadı, çünkü site henüz
halka duyurulmamıştı ve mevcut hesaplar ürün sahibinin test hesaplarıydı.
Supabase e-posta sağlayıcısı, özel SMTP ve CAPTCHA kapalı kalmaya devam ediyor.

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
4. İlk girişte yerel ve bulut kayıtları `client_updated_at` üzerinden birleştirilir; daha yeni değişiklik korunur. Karşılaştırma metin olarak değil anlık değer olarak yapılır: PostgREST timestamptz'i `+00:00` ofsetiyle döndürürken yerel kayıt `Z` biçimindedir ve iki biçim metin olarak asla eşit görünmez. Aynı cihazda art arda gelen iki değişiklik saat aynı milisaniyeyi verse bile yerel sürüm en az bir milisaniye ilerletilir.
5. Silmeler fiziksel olarak hemen kaldırılmaz. `deleted_at` tombstone'u çevrimdışı cihazların silinen kaydı geri getirmesini önler.
6. İndirilen kayıtlar gönderimden önce yerele yazılır; gönderim yarıda kesilse bile uzaktan alınan değişiklik kaybolmaz.
7. Gönderim 200'lük parçalara bölünür. Sunucu bir parçayı veri (22xxx) veya kısıt (23xxx) hatasıyla reddederse satırlar tek tek denenir; yalnız bozuk kayıt elenir, cihazda korunur ve hesap ekranında bildirilir. Ağ, JWT ve RLS hataları isteğin tamamını ilgilendirdiği için satır satır yeniden denenmez.
8. Senkronizasyon hatası yerel yazmayı engellemez; daha sonra yeniden denenebilir.
9. İkinci migration uygulandığında, iki cihaz aynı eski bulut sürümünü okuyup eşzamanlı yükleme yaparsa `personal_list_entries_keep_newer_version` tetikleyicisi daha eski `client_updated_at` değerini taşıyan güncellemeyi atlar. Böylece istemcideki “yenisi kazanır” kararı koşulsuz `upsert` yarışıyla tersine dönmez.

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

Migration dosyaları:

- `supabase/migrations/202608070001_accounts_and_personal_lists.sql`
- `supabase/migrations/202608120001_keep_newer_personal_list_version.sql`

## Orbit ile giriş

- Supabase sağlayıcısı: **Custom / OIDC**, tanımlayıcı `custom:orbit`, görünen ad
  `Orbit`. SDK'da adı birebir `custom:orbit` yazılmak zorunda.
- Issuer: `https://orbit.sametbasbug.dev`. Discovery URL alanı **bilerek boş** —
  boş bırakıldığında Supabase adresi issuer'dan türetiyor
  (`{issuer}/.well-known/openid-configuration`) ve keşif belgesi tam orada
  duruyor. İki alanı birden doldurmak, biri değişip diğeri değişmediğinde
  sessizce kırılan bir çift bırakırdı.
- İstemci: `orbit-equinox-rota`. İstemci gizli anahtarı yalnız Supabase sağlayıcı
  ayarında ve Orbit'in veritabanındaki HMAC özeti olarak var; düz metin hâli
  hiçbir yerde saklanmıyor.
- Kapsamlar: `openid, email, profile`. Orbit tarafında da izin bu üçüyle sınırlı
  kayıtlı; daha fazlası istenirse Orbit kullanıcıya yeniden sorar.
- Orbit'in gönderdiği talepler: `sub` (Rota'ya özel, siteye göre farklı),
  `name`, `preferred_username`, `picture`, `email`, `email_verified`.
- Akış PKCE: sitenin Supabase istemcisi `flowType: "pkce"` ile kurulu, dönüş
  `?code=` ile geliyor. **Elle** Supabase'in `/authorize` adresine gidip akış
  başlatılırsa Supabase implicit biçimde (adres parçasında token) döner ve site
  oturumu görmez — bu bir hata değil, sitenin kendi giriş düğmesini atlamanın
  sonucudur. Doğrulama her zaman düğmeden başlar.
- İzinli dönüş adresleri jokersiz: `https://anime.sametbasbug.dev/hesap`,
  `http://localhost:4321/hesap`, `http://127.0.0.1:4321/hesap`. Yerel geliştirme
  **4321** portunda koşmalı; başka portta düğme Orbit'e gider ama dönüş tutmaz.
- Barındırma katmanı `/hesap` için `/hesap/`'e 301 veriyor ve sorgu dizesi
  korunuyor, yani yetki kodu hayatta kalıyor. Kod sorgu dizesinde taşındığı için
  bu adım kırılgandır; değiştirilirse yeniden ölçülmeli.
- Mevcut Google kimliği silinmedi: e-posta eşleşmesi üzerinden aynı
  `auth.users` satırına `custom:orbit` kimliği eklendi, ikinci hesap açılmadı.
- Supabase'de Google sağlayıcısı **kapatıldı**. Sitedeki düğmeyi kaldırmak
  yeterli değildi: sağlayıcı açık kaldığı sürece `/authorize?provider=google`
  adresine doğrudan giden biri Orbit'i hiç görmeden hesap açabiliyordu.

### İzni geri almanın sınırı

Kullanıcı Orbit panelindeki **bağlı siteler** bölümünden izni geri alabilir.
Bu, Orbit'in Rota'ya verdiği anahtarları anında düşürür ve Rota Orbit'ten yeni
bilgi alamaz. **Ama Rota'daki oturumu kapatmaz.** Supabase kendi JWT'sini ve
yenileme anahtarını üretiyor ve yenilerken Orbit'e bir daha sormuyor; özel OIDC
sağlayıcısında geri kanal çıkışı (back-channel logout) yok. Kullanıcının Rota'dan
ayrıca çıkması gerekiyor ve arayüz bunu böyle yazıyor. Bir gün zorunlu çıkış
gerekirse bu, Supabase tarafında ayrı bir iş olarak ele alınmalı.

Orbit geçişi katalog ve editoryal veri modelini veya mevcut RLS politikalarını
değiştirmez. Gelecekte zorunlu işlem e-postası gerekirse giriş akışından bağımsız
değerlendirilir.

## Kurulu geliştirme ortamı

- Supabase organizasyonu: `Equinox`; proje: `Equinox Rota`.
- Plan ve bölge: Free, Central EU (Frankfurt).
- Data API açık; yeni tabloları otomatik yayımlama kapalı; otomatik RLS açık.
- Migration uygulanmış ve doğrulanmıştır: iki RLS tablosu, yedi sahip-kullanıcı politikası.
- Eşzamanlı cihaz yarışında eski sürümün yeniyi ezmesini önleyen ikinci migration production veritabanına uygulanmış; fonksiyon ile trigger'ın varlığı canlı sorguyla ve davranışı otomatik yakınsama senaryosuyla doğrulanmıştır.
- Auth site URL'si `https://anime.sametbasbug.dev` (jokersiz); production `/hesap` ile `localhost:4321` ve `127.0.0.1:4321` hesap dönüş adresleri izinlidir. Supabase bu listeyi **dönüş bacağında** doğruluyor: `/authorize`'a verilen `redirect_to` başlangıçta hiç denetlenmiyor, yani listeyi istekle ölçmeye çalışmak yanıltır — panelden bakmak gerekir.
- Profil yazma ve yerel liste birleştirme production üzerinde doğrulanmıştır; tekrarlanan eşitleme sıfır kayıt göndermiştir. Bu doğrulama Google akışıyla yapıldı ve Orbit geçişi kimlik katmanının altındaki bu yolları değiştirmiyor.
- İki fiziksel cihazda production girişi ve canlı liste eşitleme tamamlandı; Samet 12 Ağustos 2026'da bunu ürün kabulü için yeterli saydı. Rota çevrimdışı açılma/gezinme vadeden bir PWA olmadığından çevrimdışı site kullanımı ayrı kabul şartı değildir. Cihaz yakınsaması ve tombstone silme otomatik senaryolarla korunur. Kısmi-red başlık rozeti ile hesap ekranı gerçek production oturumunda kontrollü geçersiz yerel kayıtla doğrulandı; kayıt sunucuda kalıcılaşmadı ve test sonrasında cihazdan temizlendi.
- Supabase e-posta sağlayıcısı, özel SMTP ve CAPTCHA kapalıdır. Rota'ya özel Resend API anahtarı ile Cloudflare Turnstile bileşeni silinmiştir; ortak `sametbasbug.dev` alan adına ve Orbit anahtarına dokunulmamıştır.

## Ücretsiz plan sınırı

Free plan geliştirme ve soft alpha için yeterlidir. Düşük aktivitede otomatik duraklama ve otomatik yedek eksikliği nedeniyle kesintisiz public üretim için yükseltme kararı yayın aşamasında yeniden değerlendirilir. Ücretli plana otomatik geçilmez.
