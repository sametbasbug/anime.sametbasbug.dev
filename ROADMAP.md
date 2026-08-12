# Equinox Rota ürün yol haritası

Bu belge, Samet ile Nyx'in 6 Ağustos 2026'da onayladığı ürün sırasını korur. Kalıcı ürün adı **Equinox Rota**'dır; temel öncelik, topluluk özelliklerinden önce güçlü bir kişisel anime keşif ve takip ürünü oluşturmaktır.

## Ürün ilkeleri

- Video barındırılmaz, gömülmez veya korsan yayın bağlantısı verilmez.
- Katalog verisi yalnız izinli ve açıkça lisanslı kaynaklardan alınır.
- Türkçe açıklamalar kopyalanmaz; özgün ve spoiler kontrollü hazırlanır.
- Kişisel katalog ve takip değeri, sosyal akıştan önce tamamlanır.
- AniList doğrudan veri kaynağı yapılmaz; bunun için yazılı yetkilendirme ve gerekli eşzamanlama planı gerekir.

## Aşamalar

### 1. Kataloğu ürünleştirmek — tamamlandı

- [x] Ana sayfadaki temsili verileri gerçek kataloğa bağla.
- [x] Temel etiketleri ve tür ifadelerini Türkçeleştir; tür odaklı etiketleri öncele.
- [x] Benzer yapımlar, stüdyo ve tür keşif yolları ekle.
- [x] Arama sıralamasını ve sonuç niteliğini iyileştir.

**Tamamlanma ölçütü:** Ana sayfa ile detay ekranlarında temsili anime verisi kalmaz; temel etiketler Türkçe görünür ve kullanıcı katalog içinde birden fazla yolla gezinebilir.

### 2. Kişisel liste MVP'si — tamamlandı

- [x] `İzliyorum`, `Tamamladım`, `Planlıyorum` ve `Bıraktım` durumlarını ekle.
- [x] Puan, bölüm ilerlemesi ve kişisel not alanlarını ekle.
- [x] Arayüzü sürümlü yerel veri modeliyle doğrula; hesaplar arası kalıcılığı 4. aşamaya bırak.

**Tamamlanma ölçütü:** Kullanıcı bir animeyi listesine ekleyebilir, durumunu değiştirebilir ve bölüm ilerlemesini kaybedilmeden güncelleyebilir.

### 3. Türkçe editoryal içerik — tamamlandı

- [x] Tüm kataloğu otomatik doldurmak yerine popüler yapımlardan başla.
- [x] Özgün kısa özet, “neden izlenir?” ve spoiler içermeyen değerlendirme hazırla.
- [x] Taslak, editoryal kontrol ve yayımlama durumlarını ayır.

**Tamamlanma ölçütü:** Seçili yapımlar doğrulanmış, özgün Türkçe metinlerle zenginleşir; kaynak metinler kopyalanmaz.

### 4. Hesap ve kalıcı veri — tamamlandı

- [x] Supabase Auth + Postgres + RLS mimarisini ve local-first güven sınırını kilitle.
- [x] Şifresiz kimlik doğrulama ve kullanıcı profili arayüzünü ekle.
- [x] Yerel listeyi tombstone destekli biçimde hesaplar arasında senkronize et.
- [x] Senkronizasyonu biçim ve kısıt hatalarına karşı sağlamlaştır; kısmi reddi başlık rozetinde ayırt et.
- [x] Profil ve liste görünürlüğü tercihlerini ekle; temel tabloları sahip kullanıcıyla sınırla.
- [x] Supabase Free projesini Frankfurt bölgesinde oluştur ve RLS migration'ını uygula.
- [x] Magic-link, profil yazma ve liste birleştirmeyi iki bağımsız tarayıcı profiliyle doğrula.
- [x] Yayın domain'ini `anime.sametbasbug.dev` olarak seç.
- [x] Statik yayın hedefini GitHub Pages olarak seç.
- [x] İşlem e-postası göndericisini `Rota <giris@sametbasbug.dev>` olarak seç.
- [x] Resend'de doğrulanmış `sametbasbug.dev` alan adıyla özel SMTP'yi ve üretim Auth URL'lerini yapılandır.
- [x] İki fiziksel cihazda production girişini ve liste sayısı eşitliğini doğrula.
- [x] Kalıcı giriş yöntemini yalnız Google OAuth olarak kilitle; Discord, e-posta/parola ve magic-link'i hedef mimariden çıkar.
- [x] Google OAuth'u uygula; eski hesap aktarımı yapmadan magic-link akışını ve ona özel dış bağımlılıkları kaldır.
- [x] Google Identity Services resmî düğmesine ve nonce-korumalı Supabase ID-token doğrulamasına geç; Supabase yönlendirme alan adını kullanıcı akışından çıkar.
- [x] Kalıcı giriş yöntemini **Equinox Orbit** olarak değiştir; Google Identity Services akışını, `PUBLIC_GOOGLE_CLIENT_ID` bağımlılığını ve Supabase Google sağlayıcısını kaldır. *(12 Ağustos 2026 — yukarıdaki üç Google maddesini geçersiz kılar; onlar tarih kaydı olarak duruyor.)*
- [x] İki gerçek cihazda giriş ve senkronizasyonu doğrula; cihazlar arası güncelleme ile silme davranışını otomatik yakınsama senaryolarıyla koru. *(12 Ağustos 2026 — Samet canlı iki-cihaz eşitlemesini kabul etti; çevrimdışı site kullanımı ürün kabul şartı değildir.)*

**Tamamlanma ölçütü:** Kullanıcı güvenli biçimde giriş yapabilir ve kişisel arşivine farklı cihazlardan erişebilir.

### 5. MAL/AniList içe aktarma fizibilitesi — AniList yanıtı bekleniyor

- Resmî dışa aktarma dosyalarını ve izin verilen aktarım yöntemlerini araştır.
- Mümkünse XML/JSON dosyasıyla tek seferlik içe aktarmayı öncele.
- API tabanlı yöntemleri ancak güncel koşullar ve izinler elveriyorsa uygula.

**Durum:** Samet AniList API kullanımı için e-posta yoluyla yazılı başvuru yaptı. 12 Ağustos 2026 kararıyla yanıt gelene kadar bu aşama beklemede kalacak; API entegrasyonu yanıttan önce başlatılmayacak. Resmî dışa aktarma dosyası araştırması da aynı aşamayla birlikte ertelendi.

### 6. Topluluk ve moderasyon — tamamlandı

- [x] Topluluğu anime başlığına bağlı tekil incelemelerle sınırla; genel sosyal akışı ilk teslimin dışında tut.
- [x] İnceleme yazma/düzenleme/silme, isteğe bağlı puan ve okuyucu eylemine bağlı spoiler perdesini uygula.
- [x] İşaretlenmemiş spoiler, taciz, korsan yönlendirme, spam ve diğer ihlaller için giriş gerektiren raporlamayı uygula.
- [x] Raporların otomatik gizleme üretmediği, `app_metadata` rolüyle korunan moderasyon kuyruğunu hazırla.
- [x] Tabloları doğrudan tarayıcı erişimine kapat; kamusal okuma ve yazmayı dar RPC'lerle sınırla.
- [x] Topluluk kurallarını, kullanım koşullarını, gizlilik metnini ve otomatik koruma kontrollerini güncelle.
- [x] Production migration'ını uygula ve ürün sahibine `owner` moderasyon rolü ver.
- [x] İki ayrı gerçek hesapla inceleme, spoiler, rapor ve moderasyon kararını production'da doğrula.

**Tamamlanma ölçütü:** Kullanıcı anime incelemesini güvenle yayımlayıp yönetebilir; spoiler okuyucu onayı olmadan açılmaz; raporlar özel kuyruğa düşer ve yalnız yetkili moderatör içerik kararı verebilir.

### 7. Marka ve yayın — tamamlandı

- [x] Kalıcı proje adını **Equinox Rota**, site imzasını **Rota by Equinox** olarak kesinleştir.
- [x] Logo, domain, üretim altyapısı ve yayın kararlarını birlikte ele al.
- [x] GitHub deposunun public olacağını; kodun AGPL-3.0-only, özgün içerik ve markanın korumalı olacağını kararlaştır.
- [x] Kanonik repo adını `sametbasbug/anime.sametbasbug.dev`, korunan katmanın hak sahibini Samet Başbuğ olarak belirle.
- [x] Public repoyu, GitHub Actions Pages hattını, özel domain'i ve HTTPS'i canlıya al.
- Push, deploy, domain veya dış hesap işlemleri için Samet'in açık onayını al.

### 8. Ürün deneyimi ve görsel sistem — tamamlandı

- [x] Tasarım yönünü **Soft Celestial Otaku** olarak kilitle ve `docs/DESIGN_DIRECTION.md` içinde belgele.
- [x] Masaüstü üst menüsünü ve mobil alt gezinmeyi yeni bilgi mimarisine taşı.
- [x] Ana sayfayı arama, kişisel dönüş ve güncel seçkiler etrafında yeniden kur.
- [x] Katalog, manga açılımlı anime detayı, koleksiyon rafları ve otaku köşesi hesabını yeni görsel sisteme geçir.
- [x] Göksel yoldaşın boş, yükleme, hata, senkronizasyon ve kutlama hâllerini uygula.
- [x] Mevsimsel renk katmanı, erişilebilir mikro animasyonlar ve sayfa geçişleri ekle.
- [x] Favicon ile Open Graph/Twitter paylaşım görseli sistemini marka kimliğine taşı.
- [x] Masaüstü ve mobil görsel regresyon turunu tamamla.

**Tamamlanma ölçütü:** Arama, listeye dönüş, animeyi değerlendirme ve bölüm ilerletme temel görevleri masaüstü ve mobilde tanıtım/dekor katmanına takılmadan gerçekleştirilebilir.

### 9. Paylaşılabilir Rota profili — tamamlandı

- [x] Hesap sahibine paylaşım bağlantısını açma, kapatma ve güvenli kodunu yenileme kontrolleri ver.
- [x] `Bağlantıya sahip olanlar` ve `Herkese açık` tercihlerinin gerçek salt-okunur profil sayfasını beslemesini sağla.
- [x] Paylaşılan raflarda durum, ilerleme ve puanı göster; puanlar ile kişisel notlar için ayrı görünürlük kontrolleri ekle.
- [x] E-posta, kullanıcı UUID'si, tombstone ve senkronizasyon metadatasını açmayan dar bir Supabase RPC kullan.
- [x] Paylaşım sayfasını mobil ve masaüstünde doğrula; geçersiz, kapalı ve bulunamayan bağlantılar için güvenli boş durum hazırla.
- [x] Migration'ı production'a uygula; gerçek hesapla bağlantıyı açma, yenileme ve kapatma kabulünü tamamla.

**Tamamlanma ölçütü:** Kullanıcı rafını tek bağlantıyla kontrollü biçimde paylaşabilir; bağlantıyı kapatabilir veya yenileyebilir ve ziyaretçi yalnız sahibin açıkça görünür yaptığı alanları görür.

### 10. Kişisel istatistikler — tamamlandı

- [x] Toplam anime, bölüm, yaklaşık izleme süresi ve tamamlama oranını hesapla.
- [x] Ortalama puan ile en çok izlenen tür ve stüdyoları göster.
- [x] İstatistikleri hesap sahibinin köşesinde kullan; hesapsız local-first listeyi de destekle.
- [x] Paylaşılan profilde istatistikler için varsayılanı kapalı, ayrı bir görünürlük tercihi ekle.
- [x] Hesap ve paylaşım görünümlerini 1.920×950 ile 390×844 boyutlarında doğrula.
- [x] Production migration'ını uygula; gerçek hesapla tercih kaydı ve salt-okunur paylaşım kabulünü tamamla.

**Hesaplama sınırı:** “Planlıyorum” toplam animeye dahildir ancak tamamlama oranının paydasına girmez. İzleme süresi katalogdaki yaklaşık bölüm sürelerinden türetilir; ortalama yalnız puan verilmiş kayıtlardan hesaplanır.

### 11. Yedekleme ve taşınabilirlik — tamamlandı

- [x] Rota arşivini sürümlü JSON ve okunabilir CSV olarak dışa aktar.
- [x] Rota JSON yedeğini doğrulayıp mevcut local-first kayıtlarla güvenli biçimde birleştir.
- [x] Tombstone geçmişini tam yedekte koru; eski yedeğin daha yeni cihaz kaydını veya silmeyi ezmesini önle.
- [x] Ortak taşınabilir kayıt/birleşim katmanını gelecekteki MAL/AniList eşleyicilerinin de kullanabileceği biçimde tasarla.
- [x] Dosya boyutu, kayıt sayısı, alan sınırları, sürüm ve CSV formül enjeksiyonu korumalarını otomatik test et.
- [x] Hesaplı ve hesapsız kullanım için aynı arayüzü masaüstü/mobilde doğrula.
- [x] Değişiklikleri yayımla; canlı domainde JSON/CSV indirme ve güvenli geri yükleme kabulünü tamamla.

**Güvenlik sınırı:** CSV yalnız okunabilir dışa aktarımdır. Geri yükleme yalnız sürümü tanınan Rota JSON dosyasından yapılır; mevcut arşiv topluca silinmez ve aynı anime için daha yeni zaman damgası kazanır.

### 12. Editoryal genişleme — planlandı

- Yayımlanmış özgün Türkçe profil sayısını 8'den 20–30 güçlü yapıma çıkar.
- Ana sayfada güncel ve dönüşümlü editoryal seçkiler oluştur.
- Özgünlük, spoiler ve editoryal durum kontrollerini mevcut otomatik doğrulama hattıyla koru.

## Şu anki çalışma

İlk dört aşama ve 6. aşama tamamlandı. 5. aşama için AniList'e yazılı API başvurusu yapıldı; yanıt gelene kadar entegrasyon beklemede. Topluluğun ilk dilimi genel sosyal akış yerine anime başlığına bağlı inceleme, spoiler perdesi, raporlama ve insan kararlı moderasyon kuyruğu olarak production'da çalışıyor. Migration, kapalı temel tablo izinleri, RPC yetkileri ve ürün sahibinin `owner` rolü canlı sorguyla doğrulandı. Samet ve Nyx hesaplarıyla yayımlama, güncelleme, spoiler açma, raporlama, `İhlal yok` kararı ve silme uçtan uca geçti; test kayıtları temizlendi.

9. aşama tamamlandı: yüksek entropili bağlantı kodu, dar paylaşım RPC'si, alan bazlı puan/not izinleri, hesap kontrolleri ve `/paylas` salt-okunur görünümü production altyapısına taşındı. Gerçek Nyx hesabıyla `PRIVATE → UNLISTED`, bağlantıyı açma, token yenileme, eski bağlantının kapanması ve yeniden `PRIVATE` yapma akışları geçti. Son durumda test hesabının paylaşımı kapalıdır; otomatik güvenlik kontrolleri ile 1.920×950 ve 390×844 tarayıcı doğrulaması temizdir.

10. aşama tamamlandı: sahip görünümünde local-first istatistikler, paylaşılan profilde varsayılanı kapalı ayrı izin, ortak hesaplama katmanı ve regresyon kontrolü eklendi. Masaüstü/mobil sahip ile salt-okunur paylaşım ekranlarında yatay taşma veya konsol hatası görülmedi. `202608120004_personal_statistics.sql` production'a uygulandı; gerçek Nyx hesabında `PRIVATE → UNLISTED`, istatistik iznini açma, gerçek tokenlı paylaşım görünümü ve yeniden güvenli kapalı duruma dönme akışları geçti. Son durumda açık profil veya istatistik paylaşımı yoktur.

11. aşama tamamlandı: tam JSON yedeği aktif kayıtlarla tombstone geçmişini taşır; okunabilir CSV başlık, durum, ilerleme, puan ve not alanlarını içerir. Geri yükleme biçim/sürüm/alan sınırlarını doğrular ve ortak “yenisi kazanır” katmanıyla mevcut local-first arşive birleşir. Yerel otomasyon ile masaüstü/mobil görsel QA'nın ardından `639484a` production'a yayımlandı. Canlı girişli hesapta JSON/CSV indirme, 390 px taşmasız yerleşim, hatasız konsol ve aynı JSON'u değişikliksiz birleştirirken daha yeni/eşit cihaz kaydını koruma kabulü geçti; geri yükleme buluta yazma tetiklemedi.

Kalıcı giriş **12 Ağustos 2026'da Equinox Orbit'e taşındı**: Supabase'de `custom:orbit` adlı OIDC sağlayıcısı, issuer `https://orbit.sametbasbug.dev`, kapsamlar `openid email profile`, PKCE akışı. Google girişi tamamen kaldırıldı — düğme, betik, ortam değişkeni ve Supabase'deki sağlayıcı kaydı dahil. Geçiş penceresi bırakılmadı; site halka duyurulmamıştı ve mevcut hesaplar ürün sahibinin test hesaplarıydı. Mevcut Google kimliği e-posta eşleşmesiyle aynı kullanıcıya bağlandı, ikinci hesap açılmadı. Production'da uçtan uca giriş doğrulandı.

Supabase Auth ve RLS bırakılmadı: `profiles`, `personal_list_entries`, politikalar ve `cloud-sync.ts` değişmedi. Değişen tek şey kimliğin nereden geldiği.

Senkronizasyon katmanı ardından sağlamlaştırıldı: sürüm karşılaştırması PostgREST ile yerel kaydın zaman biçimi farkına takılmıyor, gönderim parçalı yapılıyor, sunucunun reddettiği kayıt yalıtılıp cihazda korunuyor ve başlık rozetinde ayrıca bildiriliyor. İki cihazlı yakınsama otomasyonu genişletildi; eşzamanlı yüklemede eski sürümün yeniyi ezmesini önleyen veritabanı migration'ı production'a uygulandı ve canlı sorguyla doğrulandı.

Resend Free'nin günlük 100 e-posta sınırı nedeniyle her girişte kota tüketen magic-link modeli kaldırıldı. Supabase e-posta sağlayıcısı, özel SMTP ve CAPTCHA koruması kapatıldı; Rota'ya özel Resend anahtarı, Cloudflare Turnstile bileşeni ve GitHub Pages değişkeni silindi. Hesapsız local-first kullanım korunur.

İki fiziksel cihazda canlı eşitleme çalıştı ve Samet bunu ürün kabulü için yeterli saydı. Rota çevrimdışı açılma veya gezinme vadeden bir PWA olmadığı için “çevrimdışı site kullanımı” ayrı kapanış şartı değildir. Cihazlar arası güncelleme, eşzamanlı yakınsama ve tombstone silme davranışları otomatik testlerle; eski sürümün yeniyi ezmemesi production trigger'ıyla korunur. Kısmi-red bildirimi kontrollü, sunucuda kalıcılaşmayan geçersiz bir yerel kayıtla gerçek production oturumunda doğrulandı: başlık rozeti, sorun sayacı, açıklayıcı mesaj ve Rota'nın hata hâli doğru çalıştı; test kaydı ardından cihazdan temizlendi.

Ürün deneyimi baştan aşağı **Soft Celestial Otaku** sistemine geçirildi: açık manga editoryali, kontrollü asimetri, koleksiyon rafları, otaku köşesi hesap ekranı ve yaşayan göksel yoldaş eklendi. Yoldaşın adı **Rota** olarak ürün anlatısına bağlandı; sabit yüz anatomisi site ikonu, favicon ve paylaşım kimliğinin ortak marka paydasıdır. Ana sayfada arama ile kişisel dönüş ilk görüş alanında; katalog Türkçe filtrelerle, anime detayı manga açılımıyla, Listem ise durumlara ayrılan raflarla çalışır. Mevsimsel renk katmanı, erişilebilir mikro animasyonlar ve sayfa geçişleri aynı marka dilini taşır. Kanonik tasarım ilkeleri `docs/DESIGN_DIRECTION.md` içindedir.

Katalog üretimi ayrıca veri bütünlüğü için sağlamlaştırıldı: aynı başlık/yıl/formatta kalan kesin upstream kopyalar tek kanonik kayıtta birleştiriliyor ve seçkiye giren açık sezon devamlarının mevcut önceki sezonları 900 kayıt sınırı içinde korunuyor. TMDB görsel eşleştiricisi açık sezonları normal aramadan önce seri soyundan çözüyor, sezon görsellerini tercih ediyor ve TMDB ile anime sezon modelinin uyuşmadığı doğrulanmış istisnalar için ayrı manuel override katmanı kullanıyor.

Public yayın modeli de kilitlendi: GitHub deposu public olacak; uygulama kodu AGPL-3.0-only altında, özgün editoryal içerik ile Rota/Equinox marka katmanı korumalı kalacak ve katalog verisinin ODbL/DbCL koşulları ayrı sürdürülecek.

`sametbasbug/anime.sametbasbug.dev` public reposu, GitHub Actions Pages hattı ve `https://anime.sametbasbug.dev/` özel domain'i HTTPS ile canlıdır. Production build için yalnız Supabase publishable değerleri repo değişkeni olarak sağlanır; giriş için siteye ait ayrı bir istemci kimliği gerekmiyor, çünkü kimlik Orbit'ten geliyor. `PUBLIC_GOOGLE_CLIENT_ID` değişkeni depoda hâlâ duruyor ama artık okunmuyor.
