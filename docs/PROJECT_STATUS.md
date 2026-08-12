# Equinox Rota proje durumu

Son güncelleme: 12 Ağustos 2026

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
- Giriş yöntemi: **Equinox Orbit** (Supabase'de `custom:orbit` OIDC sağlayıcısı, issuer `https://orbit.sametbasbug.dev`, PKCE). Google, Discord, e-posta/parola ve magic-link sunulmaz — Google sağlayıcısı Supabase'de de kapatıldı. Hesapsız local-first kullanım korunur. Tam yapılandırma: `docs/ACCOUNT_ARCHITECTURE.md`.
- Kişisel liste: local-first, geriye uyumlu v2 kayıt ve silme tombstone'ları.
- Proje sahipliği: Nyx. Hemera 7 Ağustos 2026'dan itibaren teknik tarafta dahildir; ürün, içerik ve tasarımda son söz Nyx'tedir.
- Tasarım yönü: **Soft Celestial Otaku** — açık kawaii manga editoryali ve kişisel anime köşesi; kanonik brif `docs/DESIGN_DIRECTION.md` içindedir.

## Tamamlananlar

> Bu bölüm bir **geçmiş kaydıdır**, güncel durum tarifi değil. Aşağıdaki Google
> satırları yapıldıkları gün doğruydu ve olduğu gibi bırakıldı; 12 Ağustos 2026
> tarihli satırlar onları geçersiz kılar. Güncel giriş yöntemi için yukarıdaki
> **Kilitli kararlar** bölümüne bak.


- 900 yapımlık aranabilir katalog, 900 detay sayfası, tür/stüdyo keşfi ve benzer yapım yolları.
- Dört durumlu kişisel liste; bölüm ilerlemesi, puan ve kişisel not.
- Sekiz yayımlanmış özgün Türkçe editoryal profil; taslak ve kontrol durumları ayrılmış içerik akışı.
- Orbit hesabı, profil ve liste görünürlüğü tercihleri.
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
- Google OAuth marka bilgileri ana sayfa, gizlilik politikası ve kullanım koşulları bağlantılarıyla gönderildi. Google incelemesi sürüyor; uygulama hassas veya kısıtlı kapsam istemediği için veri erişimi doğrulaması gerekmiyor.
- Ürün arayüzü açık, kawaii **Soft Celestial Otaku** sistemiyle baştan aşağı yenilendi. Manga editoryali, koleksiyon rafları, otaku köşesi hesap ekranı, mevsimsel renk katmanı ve özgün göksel yoldaş eklendi.
- Göksel yoldaş boş, yükleme, hata, senkronizasyon ve anime tamamlama anlarına tepki verir; mikro animasyonlar ile göksel sayfa geçişleri `prefers-reduced-motion` uyumludur.
- **12 Ağustos 2026 — giriş Orbit'e taşındı.** Google Identity Services tek-dokunuş akışı ve `signInWithIdToken` kaldırıldı; yerine tek bir `signInWithOAuth({ provider: 'custom:orbit' })` geldi. Üçüncü taraf betiği, nonce üretimi ve düğmeyi başkasının çizmesini bekleyen efekt de gitti. `PUBLIC_GOOGLE_CLIENT_ID` örnek ortam dosyasından ve deploy workflow'undan kaldırıldı.
- Geçiş penceresi bırakılmadı: site halka duyurulmamıştı ve mevcut hesaplar ürün sahibinin test hesaplarıydı. Mevcut Google kimliği silinmedi; e-posta eşleşmesiyle aynı `auth.users` satırına `custom:orbit` kimliği eklendi.
- Supabase'de Google sağlayıcısı kapatıldı. Sitedeki düğmeyi kaldırmak yeterli değildi: sağlayıcı açıkken `/authorize?provider=google` adresine doğrudan giden biri Orbit'i hiç görmeden hesap açabiliyordu.
- Gizlilik politikası ve kullanım koşulları aynı gün güncellendi; ikisi de sağlayıcı olarak Google'ı ve artık var olmayan bir parola akışını anlatıyordu.
- Giriş düğmesinde `text-transform: uppercase` bilerek kullanılmıyor: sayfa `lang="tr"` ve tarayıcı Türkçe kuralıyla büyütünce "Orbit" ekranda "ORBİT" oluyor.
- Favicon ile 1200×630 Open Graph/Twitter paylaşım kartı aynı marka diline taşındı; tüm sayfalar kanonik URL ve sosyal meta verileri üretir.
- Ana sayfa, katalog, anime detayı, kişisel liste ve hesap ekranları 1.920×950 masaüstü ile 390×844 mobil viewport'larda gerçek tarayıcı görüntüsüyle doğrulandı; yatay taşma ve tarayıcı konsolu kontrol edildi.
- Katalog yenileme hattı exact başlık/yıl/format gölge kayıtlarını tek kanonik kayıtta birleştiriyor; önemli başlıklarda en güçlü kayıt korunuyor ve seçkiye giren açık devam sezonlarının mevcut önceki sezonları 900 kayıt sınırı içinde tutuluyor. One Piece gölge kopyası kaldırıldı; Dandadan 1/2/3 birlikte katalogda. TMDB sezon eşlemesi ve doğrulanmış manuel override katmanı da devrede.
- Son doğrulama: `npm run check` sıfır hata/uyarı/ipucu; `npm run build` 1.131 statik sayfa.

## Açık işler

1. AniList API başvurusunun e-posta yanıtını bekle; yazılı izin ve koşullar netleşmeden 5. aşama entegrasyonunu başlatma.
2. ~~Google OAuth marka incelemesinin sonucunu takip et.~~ — düştü. Google girişi kaldırıldı ve Supabase sağlayıcısı kapatıldı, yani inceleme sonucunun Rota için bir etkisi kalmadı. Google Cloud'daki uygulama hâlâ duruyor; kullanılmadığı için kapatılıp kapatılmayacağı Nyx'in kararı.
3. Supabase Free planın duraklama/yedek sınırlarını yeniden değerlendir.
4. Orbit izni geri alındığında Rota oturumunun kapanmaması bilinçli bir sınır (bkz. `docs/ACCOUNT_ARCHITECTURE.md`). Zorunlu çıkış istenirse Supabase tarafında ayrı iş olarak ele alınmalı.
5. `PUBLIC_GOOGLE_CLIENT_ID` GitHub depo değişkeni hâlâ duruyor ama artık hiçbir workflow ve hiçbir kod onu okumuyor. Silinmesi Nyx'in kararı; okunmayan bir yapılandırma satırı bir gün okunuyor sanılır.

## Sıradaki ürün işleri

1. **Paylaşılabilir Rota profili:** yerel uygulama ve görsel doğrulama hazır; production migration ile gerçek hesap kabulü bekliyor.
2. **Kişisel istatistikler:** toplamlar, izleme süresi, tamamlama oranı, tür ve stüdyo eğilimleri.
3. **Yedekleme ve taşınabilirlik:** sürümlü JSON/CSV dışa aktarma ve doğrulamalı Rota yedeği geri yükleme.
4. **Editoryal genişleme:** 20–30 özgün profil ve dönüşümlü ana sayfa seçkileri.

9. aşama aktiftir. 10–12. aşamalar bu sırayla planlanmıştır; 5. aşama AniList'in yazılı yanıtından bağımsız olarak beklemede kalır.

## 9. aşama durumu

- Hesap ekranında `PRIVATE`, `UNLISTED` ve `PUBLIC` görünürlükleri; puan/not izinleri; bağlantıyı kopyalama ve token yenileme kontrolleri yerelde hazırdır.
- `/paylas?rota=<uuid>` yalnız dar `get_shared_profile` RPC yanıtını kullanır. E-posta, kullanıcı UUID'si, tombstone ve senkronizasyon zamanları yanıt şemasına girmez; temel tablolar anonim erişime açılmaz.
- Geçersiz, kapalı veya bulunamayan bağlantılar aynı güvenli boş duruma gider; sayfa `noindex,nofollow` yayımlar.
- `sharing:check`, tam `npm run check` ve 1.131 sayfalık production build temizdir. Örnek RPC yanıtıyla 1.920×950 ve 390×844 tarayıcı görselleri doğrulandı; yatay taşma ve konsol hatası yoktur.
- Sıradaki adım production migration, ardından gerçek hesapta açma → görüntüleme → token yenileme → eski bağlantının kapanması → görünürlüğü `PRIVATE` yapma kabul turudur. Bunlar tamamlanmadan 9. aşama kapanmaz.

## 6. aşama durumu

- Samet'in 12 Ağustos 2026 kararıyla MAL/AniList içe aktarma fizibilitesi sonraya ertelendi ve topluluk/moderasyon aktif işe alındı.
- İlk teslim genel sosyal akış değildir: her kullanıcı anime başına tek inceleme, isteğe bağlı 1–10 puan ve spoiler işareti kullanır.
- İnceleme tabloları doğrudan `anon`/`authenticated` erişimine kapalıdır. Kamusal okuma kullanıcı UUID'sini ve moderasyon notunu açmayan RPC'den; yazma, silme ve raporlama doğrulamalı RPC'lerden geçer.
- İncelemelerde bağlantı veritabanı katmanında reddedilir. Yeni inceleme ve raporlara saatlik sınır uygulanır; kullanıcı kendi içeriğini veya aynı içeriği ikinci kez raporlayamaz.
- Raporlar otomatik gizleme üretmez. `app_metadata.rota_role = owner|moderator` kontrolünden geçen kuyruk, ihlal yok/gizle/kaldır kararlarını uygular.
- Anime detay arayüzü, `/moderasyon` kuyruğu, `/topluluk-kurallari`, kullanım koşulları, gizlilik metni ve `community:check` yerelde hazırdır.
- Production migration uygulandı; tablolar, RPC'ler, kapalı temel tablo izinleri ve RPC yetkileri 12/12 canlı sorguyla doğrulandı. Ürün sahibinin `app_metadata.rota_role` değeri `owner` yapıldı.
- `42409b4` production'a yayımlandı. Samet ve Nyx hesaplarıyla inceleme yayımlama, 8'den 9'a güncelleme, spoiler perdesini okuyucu eylemiyle açma, rapor gönderme, owner kuyruğunda `İhlal yok` kararı ve sahip silme akışları geçti. Son kontrolde inceleme ve rapor tablolarında test kaydı kalmadı.
- 6. aşama kabulü tamamlandı.

## 4. aşama kabulü

- İki fiziksel cihazda canlı eşitleme çalıştı ve Samet 12 Ağustos 2026'da bunu ürün kabulü için yeterli saydı.
- Rota çevrimdışı açılma/gezinme vadeden bir PWA değildir; bu nedenle “çevrimdışı site kullanımı” kapanış ölçütü değildir.
- Sıralı ve eşzamanlı cihaz yakınsaması, tombstone silme, kesilen gönderimde indirilen verinin korunması ve 200'lük parçalama otomatik doğrulanır.
- Eski-yazma yarışını kapatan production trigger ile gerçek oturumdaki kısmi-red arayüzü ayrıca canlı doğrulandı.

## Değişiklik sınırı

- Repo, Pages deploy hattı, özel domain ve HTTPS canlıdır; `main` push'ları Actions deploy'unu tetikler.
- Supabase üretim Auth URL yapılandırması canlıdır. Orbit istemci sırrı yalnız Supabase sağlayıcı ayarında ve Orbit veritabanındaki HMAC özeti olarak tutulur; düz metin hâli hiçbir yerde saklanmaz.
- `.env` içindeki Supabase public değerleri yereldir ve git tarafından yok sayılır.
- TMDB poster yenilemesi yerelde `npm run posters:refresh` ile çalıştırılır. Script önce `TMDB_API_READ_TOKEN` ortam değişkenine, macOS'ta yoksa `equinox-rota-tmdb` Keychain kaydına bakar; poster yenilemek için ayrı GitHub Actions workflow'u kullanılmaz.
- Secret/service-role anahtarı tarayıcıya veya repoya konmaz.

## Son commitler

- `6da11ed` — `data: refresh TMDB poster mappings`
- `013f7c1` — `fix catalogue lineage and poster matching [skip ci]`
- `04305a2` — `feat: expand Rota's celestial otaku world`
- `85bd68a` — `feat: redesign Rota as a kawaii otaku companion`
- `655a40d` — `feat: redesign Equinox Rota as a cinematic archive`
- `cb6afc5` — `fix: state product purpose explicitly`
- `2f6d4c1` — `fix: clarify Equinox Rota branding on homepage`
- `d198a75` — `feat: launch Equinox Rota branded Google sign-in`
- `072756f` — `fix: restore account form button layout`
- `76bc25a` — `feat: protect magic-link emails from abuse`
- `217eda8` — `docs: record production auth and SMTP setup`
- `c512f37` — `chore: prepare public Rota repository [skip ci]`
- `d1099a6` — `chore: ignore .claude`
- `2d4e8da` — `feat: tell partial sync apart in the header badge`
- `fede3c4` — `docs: record sync hardening and ownership in status`
- `a9f534d` — `fix: make personal list sync resilient to format and constraint errors`
