# Equinox Rota proje durumu

Son güncelleme: 17 Ağustos 2026

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
- 50 yayımlanmış özgün Türkçe editoryal profil; taslak ve kontrol durumları ayrılmış içerik akışı.
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

## 13 Ağustos 2026 — Rota replikleri ve Orbit adı

- Rota'nın tek cümlelik sekme tekrarları 17 bağlama ayrılmış 118 özgün Türkçe replikle değiştirildi. Aynı bağlamda son gösterilen replik oturum boyunca yeniden seçilmez; sabit mesaj desteği korunur.
- Ana sayfa, katalog, anime detayı, kişisel liste, hesap ve paylaşılan profil durumları kendi replik havuzlarını kullanır. `dialogue:check` havuz sayısını, en az replik sayısını, uzunlukları ve bağlam içi tekrarları doğrular.
- Hesabım ekranındaki görünen ad düzenleme alanı kaldırıldı. Arayüz adı salt okunur gösterir ve kullanıcının Orbit hesap ekranına gitmesini sağlar.
- `202608130001_orbit_managed_display_names.sql`, görünen adı Orbit OIDC metadata'sından (`name`, `preferred_username`, eski hesaplar için `full_name`) yerel profil kopyasına aktarır; metadata değişim trigger'ı ekler, tarayıcıdan `display_name` güncellemesini kapatır ve trigger fonksiyonunu Data API çağrısına kapatır. Production sırasını koruyan `202608130002_restrict_orbit_profile_trigger_execution.sql` aynı fonksiyon iznini mevcut projede de kilitler.
- Yerel `npm run check`, Astro typecheck ve 1.131 sayfalık production build temizdir. 1.920 px masaüstü ile 390 px mobil Hesabım ve Rota yerleşimleri gerçek tarayıcıda doğrulandı; uygulama konsol hatası yoktur.
- İki migration production'a uygulandı. İki profilin yerel adı Orbit metadata'sıyla birebir eşleşiyor; metadata trigger'ı çalışır durumda, `authenticated` rolü `display_name` sütununu güncelleyemiyor ve trigger fonksiyonunu `anon`/`authenticated` rolleri çalıştıramıyor. `504a2ff` ile `89e9af3` main dalına push edildi; GitHub Pages çalıştırması `31653922774` başarıyla tamamlandı. Canlı ana sayfada art arda farklı Rota replikleri; girişli Hesabım'da Orbit adı, kaldırılmış ad input'u ve 1.920/390 px taşmasız yerleşim doğrulandı. Konsoldaki tek hata tarayıcının engellediği Cloudflare Analytics isteğiydi, uygulama hatası yoktu.

## 13 Ağustos 2026 — repo bakım ve güvenlik turu

- Astro `7.2.1`, Supabase JS `2.112.3`, Astro Check `0.9.10`, tsx ve React tiplerinin güncel uyumlu sürümleri kuruldu. TypeScript 7 büyük sürümü bilinçli olarak ayrı uyumluluk işi bırakıldı; CI ve Node tipleri Node.js 24 LTS hattında eşleştirildi.
- Pull request ve `main` push'larında tam kontrol/build çalıştıran ayrı CI; JavaScript/TypeScript için CodeQL; npm ile GitHub Actions güncellemeleri için gruplanmış haftalık Dependabot yapılandırması eklendi.
- Public repo sağlık yüzeyi `CONTRIBUTING.md`, `SECURITY.md`, davranış kuralları, CODEOWNERS, issue formları ve pull request şablonuyla tamamlandı. README ürünün güncel özellikleri, mimarisi, kurulum ve bakım hattıyla yenilendi.
- GitHub repository ayarlarında Dependabot alerts, otomatik güvenlik güncellemeleri ve private vulnerability reporting açıldı; mevcut secret scanning ile push protection korunuyor. Açıklama, homepage ve 14 konu etiketi güncel ürün kapsamına taşındı.
- İlk CodeQL taramasının işaretlediği katalog kaynak etiketi eşleşmeleri gerçek hostname ve alt alan adı sınırına bağlandı; yanıltıcı alan adları için regresyon kontrolü ana `npm run check` zincirine eklendi. Dependabot, CI'ın Node.js 24 LTS hattını aşan `@types/node` major güncellemelerini artık açmaz.
- Kawaii cursor/scrollbar katmanı `31c97d4` ile production'a yayımlandı; hassas işaretçi, metin alanı ve dokunmatik ayrımı korunuyor.

## Açık işler

1. AniList API başvurusunun e-posta yanıtını bekle; yazılı izin ve koşullar netleşmeden 5. aşama entegrasyonunu başlatma.
2. ~~Google OAuth marka incelemesinin sonucunu takip et.~~ — düştü. Google girişi kaldırıldı ve Supabase sağlayıcısı kapatıldı, yani inceleme sonucunun Rota için bir etkisi kalmadı. Google Cloud'daki uygulama hâlâ duruyor; kullanılmadığı için kapatılıp kapatılmayacağı Nyx'in kararı.
3. Supabase Free planın duraklama/yedek sınırlarını yeniden değerlendir.
4. Orbit izni geri alındığında Rota oturumunun kapanmaması bilinçli bir sınır (bkz. `docs/ACCOUNT_ARCHITECTURE.md`). Zorunlu çıkış istenirse Supabase tarafında ayrı iş olarak ele alınmalı.

## Sıradaki ürün işleri

16. aşama production kabulüyle tamamlandı. Yol haritasında AniList'in yazılı yanıtını bekleyen 5. aşama dışında açık ana ürün aşaması yoktur.

Genel sosyal akış, takipçi sistemi veya mesajlaşma ürünün sıradaki yönü değildir. 5. aşama AniList'in yazılı yanıtı gelene kadar beklemede kalır.

## 17 Ağustos 2026 — 16. aşama tamamlandı

- İzleme durumu listesinden bağımsız local-first özel koleksiyon modeli ve `/koleksiyonlar` yönetim yüzeyi production'a taşındı.
- Koleksiyonlar ad, kısa açıklama, renk kimliği, anime üyeleri, sürüm ve silme tombstone'u taşır. Anime detayından bir yapım birden fazla koleksiyona eklenebilir; bu işlem yapımı otomatik olarak “Planlıyorum” rafına sokmaz.
- Koleksiyon oluşturma, düzenleme, katalogda arayıp anime ekleme, üyeleri sıralama/çıkarma ve iki adımlı silme akışları hazırlandı. Anime detayındaki kompakt seçici aynı yapımı birden fazla koleksiyonda yönetiyor.
- Tam Rota JSON yedeği v3 koleksiyonları ve silme geçmişini taşır; v1/v2 yedekleri geriye uyumlu okunur. Birleşimde her kayıt için daha yeni koleksiyon veya tombstone kazanır.
- `personal_collections` production migration'ı dört sahip-kullanıcı RLS politikası, iki trigger, JSON üye doğrulaması ve ayrı `profiles.share_collections` izniyle uygulandı. Doğrulama fonksiyonunun tablo `CHECK` değerlendirmesi için gereken dar `authenticated` yürütme izni takip migration'ıyla düzeltildi; anonim erişim kapalı kaldı.
- Koleksiyon senkronu liste ve günlükle aynı hesap eyleminde çalışır. Gerçek Nyx hesabında koleksiyon yazma, buluta yükleme, tombstone silme ve yeniden boş duruma dönme kabulü geçti; geçici production satırı sonrasında fiziksel olarak temizlendi.
- Paylaşım izni varsayılan kapalıdır. Geçici `UNLISTED` kabulünde koleksiyon adı/açıklaması ile Medalist görünürken e-posta, kullanıcı UUID'si, koleksiyon UUID'si, tombstone ve istemci zamanları görünmedi. Son durumda profil `PRIVATE`, koleksiyon paylaşımı kapalı ve açık koleksiyon satırı yoktur.
- `collections:check`, `portability:check`, `sharing:check`, Astro typecheck ve tam production build koleksiyon yakınsaması, yedek v3 ve RPC sınırlarını korur.
- `/koleksiyonlar` 1.920×950 masaüstünde, `/anime/medalist-55318` koleksiyon seçicisi 390×844 mobilde gerçek tarayıcıyla incelendi. İki görünümde yatay taşma, kırık görsel veya konsol hatası yoktu; Medalist'i koleksiyona eklemek kişisel izleme listesinde kayıt oluşturmadı.
- `406ac56` main dalına push edildi. GitHub Pages `31984237536`, CI `31984237560` ve CodeQL `31984237537` başarıyla tamamlandı. Canlı `/hesap` ile `/koleksiyonlar` 1.920×950 ve 390×844 görünümde yeniden doğrulandı: belge genişliği viewport'u aşmadı, kırık görsel ve uygulama konsol hatası yoktu; koleksiyon paylaşım izni kapalı, JSON yedek metni v3 kapsamıyla uyumluydu.

## 17 Ağustos 2026 — 15. aşama tamamlandı

- Medalist, Girls Band Cry, Blue Giant, Kimi wa Houkago Insomnia, Ao no Hako, Takopii no Genzai, Tengoku Daimakyou, Summertime Render, Vivy: Fluorite Eye's Song, Fumetsu no Anata e, Kaoru Hana wa Rin to Saku, Horimiya, Josee to Tora to Sakana-tachi, Watashi no Shiawase na Kekkon, Suzume no Tojimari, Dorohedoro, Honzuki no Gekokujou, Grand Blue, The First Slam Dunk ve Kidou Senshi Gundam: Tekketsu no Orphans için özgün, spoiler kontrollü Türkçe profiller eklendi.
- Yayımlanmış profil sayısı 30'dan 50'ye, ana sayfa rotasyonu altıdan on adet beşli seçkiye çıktı. Her profil rotasyonda tam bir kez görünür; içerik kontrolü artık yayımlanmış profil sayısını tam 50'de tutar.
- Tam `npm run build` 77 Astro dosyasında hata, uyarı veya ipucu vermedi; 1.141 statik sayfa üretildi. Ana sayfa 1.920×950 ve 390×844 görünümde incelendi; on seçki düğmesi, beş kart, taşmasız yerleşim ve yüklenmiş posterler doğrulandı. Medalist detayında üç editoryal gerekçe ve 390 px taşmasız yerleşim ayrıca kontrol edildi.
- `ce388e8` main dalına push edildi. GitHub Pages `31981670683`, CI `31981670681` ve CodeQL `31981670694` başarıyla tamamlandı.
- Canlı ana sayfada 10. seçki elle açıldı; beş doğru kart, yüklenmiş posterler ve 1.920×950 ile 390×844 görünümde sıfır yatay taşma doğrulandı. Medalist profili üç editoryal gerekçe, HTTP 200, 390 px taşmasız görünüm ve hatasız uygulama konsoluyla geçti. 15. aşama tamamlandı.

## 17 Ağustos 2026 — 15. aşama ilk production dilimi

- Yayımlanmış, spoiler kontrollü özgün Türkçe profil sayısı 20'den 30'a çıktı. One Piece taslağı sonuçlandırıldı; Naruto, Bakemonogatari, 3-gatsu no Lion, Yuru Camp△, Pluto, Spy x Family, [Oshi no Ko], Look Back ve Chi. Chikyuu no Undou ni Tsuite eklendi.
- Ana sayfa rotasyonu altı seçkiye ve seçki başına beş profile genişledi. Her yayımlanmış profil rotasyonda tam bir kez görünür.
- Yeni `/rehberler` indeksi ile yedi statik detay sayfası eklendi: yeni başlayanlar, kısa seriler, filmler ve iyileşme teması için dört kalıcı rehber; Makoto Shinkai, Kyoto Animation ve bulunmuş aile anlatısı için üç odak yazısı.
- Editoryal doğrulama; profil sayısı ve alanlarına ek olarak rehber/yazı türünü, odak çeşitliliğini, metin sınırlarını, katalog bağlarını, yinelenen seçimleri ve spoiler/kontrol tarihlerini de korur.
- Tam `npm run build` 77 Astro dosyasında hata/uyarı vermedi ve 1.141 statik sayfa üretti. `/rehberler`, başlangıç rehberi, ana sayfa rotasyonu ve One Piece profili 1.920×950 ile 390×844 görünümde incelendi; yatay taşma, kırık poster veya uygulama konsol hatası yoktur.
- `13c51ea` production'a yayımlandı. GitHub Pages `31980481152`, CI `31980481147` ve CodeQL `31980481140` başarıyla tamamlandı. Canlı `/rehberler`, başlangıç rehberi, One Piece profili ve ana sayfadaki altı seçki doğrulandı.
- Production mobil kabulünde ana sayfanın dekoratif hero/manifesto katmanlarında 19 px yatay taşma yakalandı. `d775efe` bu katmanları 760 px altında güvenle sınırladı; Pages `31980626015`, CI `31980626078` ve CodeQL `31980626033` başarıyla tamamlandı. Canlı ana sayfa 390×844 görünümde yeniden incelendi: belge genişliği 390 px, altı seçki düğmesi, beş editoryal kart, rehber bağlantısı, kırık görsel sayısı sıfır ve konsol hatasızdır.
- Bu ilk dilimin ardından kalan 20 profil tamamlandı; son teslim yukarıdaki kayıtta belgelenmiştir.

## 17 Ağustos 2026 — 14. aşama production teslimi

- `/oneriler` sayfası kişisel liste, puan, izleme durumu ve günlük geçmişini 900 yapımlık statik katalogla yalnız tarayıcıda eşleştirir. Tamamlanan, bırakılan, hâlen izlenen ve henüz yayımlanmamış yapımlar yeni öneri havuzuna alınmaz; planlanan raf adayları açık etiketiyle öncelendirilebilir.
- Her öneri tür, stüdyo, format, plan rafı veya katalog başlangıcı gerekçelerinden en az birini gösterir. Kullanıcıya gizli uyum yüzdesi sunulmaz; harici profil veya öneri servisi kullanılmaz.
- “Kısa bir şey”, film, tamamlanmış 6–26 bölümlük tek sezon ve sakin/enerjik/duygusal/gizemli ruh hâli yolları eklendi. “Başka seç” aynı yol içindeki adayı değiştirir; katalog sonucu tek hareketle planlananlara eklenebilir.
- Uzun süredir bekleyen planlar ile ara verilen aktif yapımlar yalnız eşik aşıldığında, “zorunda değilsin” ve “acelesi yok” diliyle hatırlatılır. Bu yüzey yeni veri saklamaz ve mevcut paylaşılabilir profile katılmaz.
- `discovery:check` kişisel sinyalleri, aday dışlamalarını, sekiz seçim yolunu, plan rafı önceliğini, gerekçe zorunluluğunu ve baskıcı olmayan hatırlatma metnini doğrular.
- `9a7f848` main dalına push edildi. GitHub Pages `31979122628`, CI `31979122623` ve CodeQL `31979122627` başarıyla tamamlandı.
- Canlı `/oneriler` gerçek production arşivindeki planlı Re:Zero kaydını açık “Planladığın raftan” etiketiyle önceliklendirdi. Film yolu yalnız film döndürdü; “Başka seç” Kimi no Na wa.'dan Chainsaw Man Movie: Reze-hen'e geçti.
- Canlı sayfa 1.920×950 masaüstü ve 390×844 mobil görünümde incelendi; yatay taşma ve uygulama konsol hatası yoktur. 14. aşama tamamlandı.

## 17 Ağustos 2026 — 13. aşama production teslimi

- Anime detayına bölüm aralığı, izleme tarihi ve 280 karakterlik özel not kaydeden günlük bestecisi eklendi. Günlük kaydı animeyi gerekirse listeye alır ve ilerlemeyi yalnız ileri taşır.
- `/gunluk` ekranı kayıtları güne göre gruplar; aylık bölüm/anime/izleme günü özetini ve kayıt yoğunluklu takvimi gösterir. Kayıtlar düzenlenebilir ve tombstone bırakarak silinebilir.
- `rota.watch-journal.v1` local-first veri alanı kişisel listeden ayrı tutulur. `watch_journal_entries` için sahip-kullanıcı RLS, sürüm yarışı koruması ve istemci tombstone'ları içeren `202608170001_watch_journal.sql` migration'ı production'a uygulanmıştır.
- Hesap eşitlemesi raf ile günlüğü birlikte çalıştıracak biçimde genişletildi. JSON yedek biçimi v2'ye yükseltildi; günlük ile silme geçmişi tam yedeğe katıldı ve v1 yedekleri geriye uyumlu okunuyor.
- `journal:check`, yerel sanitizasyonu, silme sürümünü, bulut birleşimini ve migration güvenlik kurallarını ana kontrol zincirinde doğrular.
- Production şeması canlı sorguda tablo, açık RLS, dört sahip politikası, iki trigger, kapalı anonim erişim ve kapalı trigger-fonksiyonu çağrı yetkisiyle doğrulandı. Migration sırasında mevcut kişisel liste satırları değişmedi.
- `b4d72f9` main dalına push edildi; GitHub Pages çalıştırması `31976802987` başarıyla tamamlandı. Canlı Nyx hesabında 1–2. bölüm kaydı liste ilerlemesini 2'ye taşıdı, buluta çıktı, boş yerel günlük durumuna geri indirildi ve tombstone olarak eşitlendi. Kesin kimlikli günlük/liste test satırları ile yerel tombstone'ları kabul sonunda temizlendi; production günlük satırı `0`, kişisel liste satırı `4` toplam / `3` aktif oldu. Kabul öncesinden kalan aynı Death Note test tombstone'u da temizlendi; mevcut aktif liste verisi korundu.
- Deploy sonrası Dependabot'un işaretlediği transitive `nanoid <3.3.18` açığı güvenli `3.3.18` override'ıyla kapatıldı (`c6db4e5`). `npm audit` sıfır açık; tam kontrol ve 1.132 sayfalık production build temizdir.
- Canlı `/gunluk/` 1.920×950 ve 390×844 görünümde yatay taşma üretmedi; konsol uygulama hatası vermedi. 13. aşama tamamlandı.

## 12. aşama durumu

- 11 yeni profil eklendi ve Kimetsu no Yaiba editoryal kontrolden geçirilerek yayımlandı; toplam yayımlanmış özgün Türkçe profil sayısı 8'den 20'ye çıktı. Tek taslak One Piece kaydı halka açılmaz.
- Yayımlanmış profiller dörder yapımlık beş tematik seçkiye ayrıldı. Ana sayfadaki Rota Editörlüğü rafı pazartesi temelli UTC haftasına göre otomatik döner; beş numaralı kontrol seçkiler arasında elle geçiş de sağlar.
- `content:check` artık `spoilerSafe` onayını, geçerli kontrol tarihini, editoryal metinde bağlantı ve yinelenen uzun cümle bulunmamasını, 20–30 yayımlanmış profil sınırını ve her profilin rotasyonda tam bir kez bulunmasını doğrular.
- Yerel `content:check`, Astro kontrolü ve 1.131 sayfalık production build temizdir. `a792e4e` production'a yayımlandı ve GitHub Pages çalıştırması `31652279533` başarıyla tamamlandı. Canlı ana sayfa rafı 1.920×950 ve 390×844 boyutlarında görsel kontrolden geçti; beş seçkinin elle geçişi, haftalık sıra ve Vinland Saga'nın başlık, değerlendirme ve hedef kitle metinleri doğrulandı. Mobil profil sayfası 390 px'de yatay taşma üretmedi; konsoldaki tek hata tarayıcı tarafından engellenen Cloudflare Analytics isteğiydi, uygulama hatası yoktu.

## 11. aşama durumu

- Hesap ekranı giriş durumundan bağımsız olarak tam, sürümlü Rota JSON yedeği ve insan tarafından okunabilir CSV üretir. JSON aktif kayıtlarla tombstone geçmişini; CSV başlık, durum, ilerleme, toplam bölüm, puan, not ve güncellenme zamanını taşır.
- JSON geri yükleme biçim, sürüm, tarih, anime kimliği, durum, ilerleme, puan, not, 10 MB dosya ve 20.000 kayıt sınırlarını doğrular. Tanınmayan veya bozuk dosya yerel arşivi değiştirmeden reddedilir.
- Ortak birleşim katmanında aynı anime için daha yeni zaman damgası kazanır. Böylece eski bir yedek daha yeni cihaz kaydını ezmez ve daha yeni tombstone'u diriltmez; bu katman gelecekteki izinli dış kaynak eşleyicileri tarafından da kullanılabilir.
- CSV hücreleri RFC 4180 biçiminde kaçırılır, UTF-8 BOM taşır ve tablo uygulamalarındaki formül enjeksiyonuna karşı metin başlangıçları etkisizleştirilir. CSV geri yükleme formatı değildir.
- `portability:check`, tam `npm run check` ve 1.131 sayfalık build temizdir. 1.920×950 ile 390×844 arayüz doğrulamasında yatay taşma veya konsol hatası yoktur. Gerçek JSON/CSV indirme, bozuk dosya reddi ve eski tarihli geçerli yedeğin mevcut kaydı koruması geçti; production aktif liste sayısı değişmeden `3` kaldı.
- `639484a` main dalına push edildi; GitHub Pages çalışması `31651015501` build ve deploy adımlarını başarıyla tamamladı. Canlı girişli hesapta sürümlü JSON ile BOM'lu CSV gerçek dosya olarak indirildi. Aynı JSON'un geri yüklenmesi `0 yeni / 0 güncellenen / 0 silme` sonucu verdi ve daha yeni/eşit cihaz kaydını korudu; bulut senkronizasyonu tetiklenmedi. 1.920 px masaüstü ile 390 px mobil canlı görünümde taşma ve konsol hatası yoktur. 11. aşama tamamlandı.

## 10. aşama durumu

- Hesap ekranı toplam anime, izlenen bölüm, yaklaşık izleme süresi, tamamlama oranı ve yalnız puanlanmış kayıtlardan ortalama puanı gösterir. En sık görülen üç tür ve stüdyo aynı ortak hesaplama katmanından gelir.
- Hesapsız local-first kullanım da istatistik üretir. “Planlıyorum” toplam animeye dahildir fakat tamamlama oranının paydasına girmez; izleme süresi katalogdaki yaklaşık bölüm sürelerinden türetilir.
- Paylaşılan profil istatistikleri varsayılan olarak kapalıdır ve puan/not tercihlerinden ayrı `share_statistics` izni ister. Puan paylaşımı kapalıysa paylaşılan ortalama puan da üretilmez.
- `statistics:check`, tam `npm run check` ve 1.131 sayfalık production build temizdir. Sahip ve örnek paylaşılan profil 1.920×950 ile 390×844 boyutlarında doğrulandı; yatay taşma veya konsol hatası yoktur.
- `202608120004_personal_statistics.sql` production'a uygulandı. Sütunun varsayılanı kapalı oluşu, girişli kullanıcının yalnız tercih sütununu güncelleyebilmesi, anonim kullanıcının güncelleyememesi ve dar paylaşım RPC'sinin anonim çağrılabilmesi canlı sorguyla doğrulandı.
- Gerçek Nyx hesabında `PRIVATE → UNLISTED`, istatistik paylaşımını açma, profil tercihini kaydetme ve gerçek tokenlı salt-okunur istatistik görünümü geçti. Ardından profil yeniden `PRIVATE`, istatistik izni kapalı duruma getirildi; eski bağlantı güvenli kapalı ekranına döndü. Son sorguda iki profil için de dış görünürlük ve istatistik paylaşımı sıfır, üç aktif liste kaydı değişmeden kaldı. 10. aşama kabulü tamamlandı.

## 9. aşama durumu

- Hesap ekranında `PRIVATE`, `UNLISTED` ve `PUBLIC` görünürlükleri; puan/not izinleri; bağlantıyı kopyalama ve token yenileme kontrolleri production şemasıyla çalışır.
- `/paylas?rota=<uuid>` yalnız dar `get_shared_profile` RPC yanıtını kullanır. E-posta, kullanıcı UUID'si, tombstone ve senkronizasyon zamanları yanıt şemasına girmez; temel tablolar anonim erişime açılmaz.
- Geçersiz, kapalı veya bulunamayan bağlantılar aynı güvenli boş duruma gider; sayfa `noindex,nofollow` yayımlar.
- `sharing:check`, tam `npm run check` ve 1.131 sayfalık production build temizdir. Örnek RPC yanıtıyla 1.920×950 ve 390×844 tarayıcı görselleri doğrulandı; yatay taşma ve konsol hatası yoktur.
- `shareable_profiles` migration'ı production'a uygulandı. İki mevcut profil için tokenların dolu ve benzersiz olduğu; anonim rollerin temel profil/liste tablolarını okuyamadığı; paylaşım RPC'sinin anonim, token yenilemenin yalnız girişli kullanıcı tarafından çağrılabildiği canlı sorguyla doğrulandı.
- Gerçek Nyx hesabında ilk profil kaydı eski `upsert` akışının korumalı `id` sütununda güncelleme yetkisi istemesi nedeniyle reddedildi. Token yetkisini gevşetmek yerine istemci yalnız izinli tercih sütunlarında dar `UPDATE` kullanacak biçimde düzeltildi ve regresyon kontrolü eklendi.
- Ardından `PRIVATE → UNLISTED` kaydı, gerçek paylaşım görünümü, token yenileme, eski bağlantının kapanması, yeni bağlantının açılması ve yeniden `PRIVATE` yapma uçtan uca geçti. Son sorguda açık `UNLISTED/PUBLIC` test profili kalmadı; 9. aşama kabulü tamamlandı.

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

- `406ac56` — `feat: complete personal collections`
- `6b0a584` — `feat: start personal collections`
- `c6db4e5` — `fix: pin patched nanoid dependency`
- `b4d72f9` — `feat: add local-first watch journal`
- `584a962` — `fix: harden catalogue source labels`
- `f38415a` — `docs: polish the public repository`
- `096d64e` — `ci: add repository security automation`
- `5e3046b` — `chore: refresh Astro project dependencies`
- `31c97d4` — `feat: add kawaii cursors and scrollbars`
- `68fc39a` — `docs: complete Rota dialogue and Orbit name rollout`
- `89e9af3` — `fix: restrict Orbit profile trigger execution`
- `504a2ff` — `feat: expand Rota dialogue and delegate names to Orbit`
- `406b610` — `docs: complete editorial expansion rollout`
- `a792e4e` — `feat: expand Rota editorial selections`
- `91532ed` — `docs: complete portability rollout`
- `639484a` — `feat: add portable Rota backups`
- `0f932b1` — `docs: complete personal statistics rollout`
- `d00d106` — `feat: add personal Rota statistics`
- `e628d19` — `fix: complete share profile rollout`
- `3d34574` — `feat: add shareable Rota profiles`
