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

### 4. Hesap ve kalıcı veri — yapım aşamasında

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
- [ ] İki gerçek cihazla giriş, birleştirme, çevrimdışı düzenleme ve silme senaryolarını doğrula.

**Tamamlanma ölçütü:** Kullanıcı güvenli biçimde giriş yapabilir ve kişisel arşivine farklı cihazlardan erişebilir.

### 5. MAL/AniList içe aktarma fizibilitesi

- Resmî dışa aktarma dosyalarını ve izin verilen aktarım yöntemlerini araştır.
- Mümkünse XML/JSON dosyasıyla tek seferlik içe aktarmayı öncele.
- API tabanlı yöntemleri ancak güncel koşullar ve izinler elveriyorsa uygula.

### 6. Topluluk ve moderasyon

- İnceleme, spoiler işareti ve raporlama araçlarını tasarla.
- Korsan bağlantı, taciz ve spoiler için moderasyon kurallarını uygula.
- Kişisel takip ürünü yeterli olgunluğa ulaşmadan sosyal akış ekleme.

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

## Şu anki çalışma

İlk üç aşama tamamlandı. Dördüncü aşama Supabase Free üzerinde çalışıyor: profil/gizlilik yazımı, yedi sahip-kullanıcı RLS politikası ve cihazlar arası liste birleştirme doğrulandı.

Kalıcı giriş **12 Ağustos 2026'da Equinox Orbit'e taşındı**: Supabase'de `custom:orbit` adlı OIDC sağlayıcısı, issuer `https://orbit.sametbasbug.dev`, kapsamlar `openid email profile`, PKCE akışı. Google girişi tamamen kaldırıldı — düğme, betik, ortam değişkeni ve Supabase'deki sağlayıcı kaydı dahil. Geçiş penceresi bırakılmadı; site halka duyurulmamıştı ve mevcut hesaplar ürün sahibinin test hesaplarıydı. Mevcut Google kimliği e-posta eşleşmesiyle aynı kullanıcıya bağlandı, ikinci hesap açılmadı. Production'da uçtan uca giriş doğrulandı.

Supabase Auth ve RLS bırakılmadı: `profiles`, `personal_list_entries`, politikalar ve `cloud-sync.ts` değişmedi. Değişen tek şey kimliğin nereden geldiği.

Senkronizasyon katmanı ardından sağlamlaştırıldı: sürüm karşılaştırması PostgREST ile yerel kaydın zaman biçimi farkına takılmıyor, gönderim parçalı yapılıyor, sunucunun reddettiği kayıt yalıtılıp cihazda korunuyor ve başlık rozetinde ayrıca bildiriliyor.

Resend Free'nin günlük 100 e-posta sınırı nedeniyle her girişte kota tüketen magic-link modeli kaldırıldı. Supabase e-posta sağlayıcısı, özel SMTP ve CAPTCHA koruması kapatıldı; Rota'ya özel Resend anahtarı, Cloudflare Turnstile bileşeni ve GitHub Pages değişkeni silindi. Hesapsız local-first kullanım korunur.

Aşamanın kapanması için iki fiziksel cihazda çevrimdışı düzenleme ve silme testi gerekiyor; bu borç Google döneminden devraldı ve Orbit geçişi onu kapatmadı. Production'da ikinci eşitlemenin sıfır kayıt göndermesi doğrulandı; kısmi red bildiriminin gerçek oturumdaki görünümüne ayrıca bakılacak.

Ürün deneyimi baştan aşağı **Soft Celestial Otaku** sistemine geçirildi: açık manga editoryali, kontrollü asimetri, koleksiyon rafları, otaku köşesi hesap ekranı ve yaşayan göksel yoldaş eklendi. Yoldaşın adı **Rota** olarak ürün anlatısına bağlandı; sabit yüz anatomisi site ikonu, favicon ve paylaşım kimliğinin ortak marka paydasıdır. Ana sayfada arama ile kişisel dönüş ilk görüş alanında; katalog Türkçe filtrelerle, anime detayı manga açılımıyla, Listem ise durumlara ayrılan raflarla çalışır. Mevsimsel renk katmanı, erişilebilir mikro animasyonlar ve sayfa geçişleri aynı marka dilini taşır. Kanonik tasarım ilkeleri `docs/DESIGN_DIRECTION.md` içindedir.

Katalog üretimi ayrıca veri bütünlüğü için sağlamlaştırıldı: aynı başlık/yıl/formatta kalan kesin upstream kopyalar tek kanonik kayıtta birleştiriliyor ve seçkiye giren açık sezon devamlarının mevcut önceki sezonları 900 kayıt sınırı içinde korunuyor. TMDB görsel eşleştiricisi açık sezonları normal aramadan önce seri soyundan çözüyor, sezon görsellerini tercih ediyor ve TMDB ile anime sezon modelinin uyuşmadığı doğrulanmış istisnalar için ayrı manuel override katmanı kullanıyor.

Public yayın modeli de kilitlendi: GitHub deposu public olacak; uygulama kodu AGPL-3.0-only altında, özgün editoryal içerik ile Rota/Equinox marka katmanı korumalı kalacak ve katalog verisinin ODbL/DbCL koşulları ayrı sürdürülecek.

`sametbasbug/anime.sametbasbug.dev` public reposu, GitHub Actions Pages hattı ve `https://anime.sametbasbug.dev/` özel domain'i HTTPS ile canlıdır. Production build için yalnız Supabase publishable değerleri repo değişkeni olarak sağlanır; giriş için siteye ait ayrı bir istemci kimliği gerekmiyor, çünkü kimlik Orbit'ten geliyor. `PUBLIC_GOOGLE_CLIENT_ID` değişkeni depoda hâlâ duruyor ama artık okunmuyor.
