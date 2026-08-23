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

### 5. MAL/AniList liste içe aktarma — başladı

- [x] MAL'in resmî XML/XML.GZ ve AniList'in kullanıcı veri dışa aktarma biçimlerini güncel örneklerle doğrula.
- [x] Dış kimlikleri kalıcı Rota kimliklerine eşle; belirsiz veya katalog dışı kayıtları sessizce uydurmak yerine önizlemede ayır.
- [x] Dosyayı tarayıcıda, Rota sunucusuna veya üçüncü tarafa yüklemeden ayrıştır; biçim, boyut, kayıt ve alan sınırlarını uygula.
- [x] Durum, ilerleme, puan ve notu mevcut taşınabilirlik katmanına dönüştür; kullanıcı onayından önce hiçbir kaydı değiştirme.
- [x] Daha yeni yerel kayıt/tombstone üstünlüğünü koruyan birleşimi, tekrar içe aktarmayı ve kısmi eşleşmeyi otomatik test et.
- [ ] Masaüstü/mobil önizleme ve production kabulünü tamamla.

**Kaynak sınırı:** AniList'e gönderilen yazılı API başvurusu kullanıcı listesi içe aktarma için değil, AniList'i Rota'nın anime katalog kaynağı yapmak içindi. Katalog artık Kitsu API/CDN ile çalıştığından cevapsız kalan bu başvuru 5. aşamayı bloke etmez. İçe aktarma kullanıcının kendi resmî dışa aktarma dosyası üzerinden yapılır; AniList API'si katalog kaynağı olarak eklenmez ve MAL scrape edilmez.

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

### 12. Editoryal genişleme — tamamlandı

- [x] Yayımlanmış özgün Türkçe profil sayısını 8'den 20 güçlü yapıma çıkar.
- [x] Ana sayfada yayımlanmış profillerden beslenen beş tematik, haftalık dönüşümlü seçki oluştur.
- [x] Özgünlük, spoiler, editoryal durum ve seçki bütünlüğü kontrollerini otomatik doğrulama hattıyla koru.
- [x] Değişiklikleri yayımla; canlı ana sayfa rotasyonu ile yeni profil sayfalarını kabul et.

**Editoryal sınır:** Seçkiler yalnız `PUBLISHED` ve `spoilerSafe` onaylı profilleri kullanır. Her yayımlanmış profil rotasyonda tam bir kez yer alır; taslak veya kontroldeki metin ana sayfaya çıkamaz.

### 13. İzleme günlüğü ve kişisel hafıza — tamamlandı

- [x] Bölüm veya bölüm aralığını izleme tarihiyle birlikte günlüğe kaydet.
- [x] Anime detayından hızlı kayıt oluştur; yeni kayıt ilerleme sayacını güvenli biçimde ileri taşısın.
- [x] Günlük kayıtlarını tarihe göre gruplayan, aylık özeti olan ayrı bir ekran hazırla.
- [x] Kısa bölüm notlarını düzenleme ve günlük kaydını silme akışlarını ekle.
- [x] Günlüğü local-first sakla; tombstone, cihazlar arası senkronizasyon ve RLS sınırlarını kişisel listeyle aynı güven düzeyinde uygula.
- [x] Tam JSON yedeğine günlük kayıtlarını ve silme geçmişini ekle; eski yedek sürümünü geriye uyumlu okumaya devam et.
- [x] Yerel otomasyon, production migration ve boş ikinci cihaz durumundan indirme dâhil cihazlar arası kabul turunu tamamla.

**Tamamlanma ölçütü:** Kullanıcı neyi, hangi gün ve hangi bölüm aralığında izlediğini kaydedebilir; kayıtlar çevrimdışı cihaz yazımını kaybetmeden hesapla eşitlenir ve tam yedekle taşınır.

### 14. Akıllı kişisel keşif — tamamlandı

- [x] Kişisel puan, tür, stüdyo, format ve izleme geçmişinden açıklanabilir öneriler üret.
- [x] “Kısa bir şey”, “film”, “tek sezon” ve ruh hâli odaklı seçim yolları ekle.
- [x] Uzun süredir bekleyen veya yarım kalan yapımları baskıcı olmayan biçimde hatırlat.
- [x] “Bu akşam ne izlesem?” seçicisini katalog ve kişisel arşiv üzerinde çalıştır.
- [x] Soğuk başlangıç, aday eleme, gerekçe, seçim yolları ve hatırlatma dilini otomatik kontrol hattına ekle.
- [x] Yerel teslimi yayımla; gerçek production arşiviyle masaüstü/mobil kabul turunu tamamla.

**Ürün sınırı:** Öneriler gizli bir puan veya dış profil çıkarımı gibi davranmaz; kullanıcıya neden gösterildiğini açıkça anlatır ve harici API gerektirmeden çalışır.

### 15. Editoryal derinlik — tamamlandı

- [x] Yayımlanmış özgün Türkçe profil sayısını önce 50 güçlü yapıma çıkar.
- [x] İlk derinlik diliminde profil sayısını 20'den 30'a çıkar; ana sayfa rotasyonunu altı beşli seçkiye genişlet.
- [x] Yeni başlayanlar, kısa seriler, filmler ve temalar için kalıcı editoryal rehberler hazırla.
- [x] Yönetmen, stüdyo ve anlatı teması odaklı keşif yazıları ekle.
- [x] One Piece taslağını doğrulayıp editoryal akış içinde sonuçlandır.
- [x] Rehber/yazı türü, metin sınırı, katalog bağı, spoiler onayı ve odak çeşitliliğini otomatik kontrolde koru.
- [x] İlk 30 profillik dilimi yayımla; masaüstü/mobil production kabulünü tamamla.
- [x] Kalan 20 güçlü profili tamamla; son teslimi yayımla ve production kabulünü bitir.

**Editoryal sınır:** Sayı uğruna otomatik veya yüzeysel metin üretilmez; her profil özgünlük, spoiler ve editoryal kontrol kapılarından geçer.

### 16. Kişisel koleksiyonlar — tamamlandı

- [x] Kullanıcının ad, kısa açıklama ve renk kimliğiyle kendi anime koleksiyonlarını oluşturmasını sağla.
- [x] Bir animeyi izleme durumu listesine eklemek zorunda bırakmadan birden fazla koleksiyona ekle veya koleksiyondan çıkar.
- [x] Koleksiyon yönetimi için arama, düzenleme, sıralama ve güvenli silme akışlarını masaüstü ile mobilde hazırla.
- [x] Veriyi local-first, sürümlü ve tombstone destekli tut; eski cihaz yazımının yeni koleksiyonu veya silmeyi ezmesini önle.
- [x] Tam Rota JSON yedeğini koleksiyonlar ve silme geçmişiyle yeni sürüme yükselt; eski yedekleri geriye uyumlu okumayı sürdür.
- [x] Supabase tablosu, sahip-kullanıcı RLS politikaları ve yenisi-kazanır trigger'ıyla cihazlar arası koleksiyon senkronizasyonu ekle.
- [x] Koleksiyon paylaşımını ayrı ve varsayılanı kapalı bir izinle mevcut salt-okunur Rota profiline bağla.
- [x] Yerel otomasyon, production migration, iki cihazlı yakınsama ve masaüstü/mobil canlı kabul turunu tamamla.

**Kişisel sınır:** Koleksiyonlar izleme durumunun yerine geçmez ve animeyi otomatik olarak kişisel listeye eklemez. Ad, açıklama ve koleksiyon üyeliği kullanıcıya aittir; paylaşım açıkça etkinleştirilmedikçe özel kalır.

### 17. Sezon panosu — tamamlandı

- [x] Yeni başlayan, devam eden ve yaklaşan animeleri tek bir sezon görünümünde topla.
- [x] Sezon, yıl, yayın durumu, format ve tür filtrelerini Türkçe ürün diliyle sun.
- [x] Kişisel listedeki `Planlıyorum` ve `İzliyorum` kayıtlarını sezon kataloğuyla birleştir; kullanıcının kendi izleme planını öne çıkar.
- [x] Anime detayına, kişisel listeye ve uygun editoryal profile doğrudan geçişler ekle.
- [x] Katalog sürümü ile veri tazeliğini görünür kıl; kesin yayın saati veya bildirim sözü verme.
- [x] İzinli mevcut katalog verisiyle çalış; harici API, scraping veya arka planda yayın takibi ekleme.
- [x] Sezon sınıflandırması, filtreler, kişisel durum eşleşmesi ve boş durumları otomatik kontrollerle koru.
- [x] Masaüstü/mobil yerel kabulü tamamla; yayın için ayrıca production kabulü yap.

**Ürün sınırı:** Sezon panosu bir yayın takvimi veya bölüm bildirimi servisi değildir. Kaynağın doğrulayabildiği sezon/yıl ve yayın durumu verisini kişisel planla birleştirir; veri belirsizliğini kesin bilgi gibi sunmaz.

**Tamamlanma ölçütü:** Kullanıcı güncel ve yaklaşan sezonları tek ekranda gezebilir, kişisel planındakileri ayırt edebilir ve seçtiği yapıma liste ya da detay akışından devam edebilir.

### 18. Rota yıllığı — tamamlandı

- [x] Günlük ve kişisel arşivden aylık/yıllık izleme özeti üret.
- [x] İzlenen anime, bölüm, yaklaşık süre, tamamlanan yapım ve aktif gün sayılarını dönem bazında göster.
- [x] En çok izlenen türleri, stüdyoları, en yüksek puan verilen yapımları ve kişisel dönüm noktalarını öne çıkar.
- [x] Veri azlığında uydurma içgörü üretmeyen, sakin ve açıklanabilir boş/erken dönem durumları hazırla.
- [x] Özetin cihazda çalışmasını sağla; hesaplı kullanımda mevcut local-first senkronize arşivden türet.
- [x] Paylaşılabilir yıllık kartı ayrı, varsayılanı kapalı gizlilik kontrolüyle sun; kişisel notları ve özel kimlik alanlarını hiçbir zaman karta taşıma.
- [x] Dönem sınırları, zaman dilimi, istatistik tutarlılığı, gizlilik ve kart içeriğini otomatik kontrollerle koru.
- [x] Masaüstü/mobil görünüm ile paylaşım kartını görsel kabul turundan geçir.

**Gizlilik sınırı:** Yıllık özet varsayılan olarak özeldir. Paylaşım yalnız kullanıcının açık eylemiyle üretilir; kişisel notlar, hesap kimlikleri, tombstone ve senkronizasyon metadatası paylaşılmaz.

**Tamamlanma ölçütü:** Kullanıcı seçtiği ay veya yıl için anime yolculuğunu tutarlı sayılar ve açıklanabilir öne çıkanlarla görebilir; isterse güvenli bir özet kartını ayrıca paylaşabilir.

### 19. ~~Kitsu katalog geçişi~~ — production kabulüyle tamamlandı

- [x] Güncel Kitsu GraphQL/REST alan sözleşmesini, sayfalamayı, oran limitini, hata davranışını ve media CDN kullanımını doğrula.
- [x] Kitsu API yanıtını ortak Rota katalog şemasına dönüştüren tek adapter ve otomatik sözleşme kontrollerini hazırla.
- [x] Güvenli eşleşen 797 eski Rota kimliğini koru; güvenli eşleşmeyen veya görsel kapısını geçmeyen 103 kaydı onaylanan daha geniş seçkiyle değiştir.
- [x] Manami metadata ve TMDB poster hattının yerine Kitsu metadata ile Kitsu poster/cover URL'lerini kullanan 2.500 yapımlık katalog üret.
- [x] Public katalog için %100 geçerli poster ve sıfır kırık görsel kapısını zorunlu kıl.
- [x] Arama, tür/stüdyo keşfi, benzer yapımlar, sezon panosu, öneriler, istatistikler, yıllık ve 50 editoryal bağı yeni şemayla doğrula.
- [x] Masaüstü/mobil production kabulünden sonra kaynak seçimini Kitsu'ya geçir; eski Manami/TMDB hattını ancak kabul tamamlanınca kaldır.

**Mimari sınır:** Kitsu tek harici anime kaynağıdır. Ham API yanıtları ve görsel dosyaları aynalanmaz; statik GitHub Pages yapısı için yalnız Rota'nın kullandığı normalize katalog snapshot'ı tutulur ve görseller Kitsu CDN URL'lerinden gösterilir. Kullanıcıya ait liste, günlük, koleksiyon, paylaşım ve inceleme kayıtlarının Rota kimlikleri kaynak değişiminde değiştirilmez.

**Kanonik uygulama planı:** [`docs/KITSU_MIGRATION_PLAN.md`](./docs/KITSU_MIGRATION_PLAN.md)

**Tamamlanma ölçütü:** Production'ın tek harici anime metadata/görsel kaynağı Kitsu olur; 2.500 yapımlık public katalog %100 poster kapsamasıyla çalışır, korunabilen 797 eski kimlik ve bütün editoryal bağlar aynı kalır, eski Manami/TMDB çalışma zamanı bağımlılığı kalmaz.

### 20. ~~Katalog genişletmesi~~ — production kabulüyle tamamlandı

- [x] Mevcut 2.500 Rota kimliğini ve Kitsu eşleşmesini değiştirmeden seçkiyi 7.500 yapıma çıkar.
- [x] Yenileme hattını Kitsu oran sınırı, kontrollü eşzamanlılık, retry/`Retry-After` ve başarısız snapshot korumasıyla büyüt.
- [x] 7.500 kaydın tamamında benzersiz Rota/Kitsu kimliği, benzersiz slug, geçerli poster ve 50/50 editoryal bağ kapısını koru.
- [x] İstemci aramasının normalize metin indeksini katalog yüklenirken bir kez üret; her tuşta 7.500 kaydı yeniden normalize etme.
- [x] Statik detay sayfalarındaki benzer-anime hesabını tür ters indeksiyle daralt; 7.709 sayfalık tam build'i 2 dakika 45 saniyeden 34,81 saniyeye indirirken öneri sırasını koru.
- [x] 1.920×950 masaüstü ve 390×844 mobil yerel tarayıcı kabulünü tamamla; arama gecikmesini ve yatay taşmayı ölç.
- [x] Production yayın sonrası canlı kabulü tamamla.

**Kapasite sınırı:** Mevcut tek JSON + statik detay sayfası mimarisi 7.500 kayıt için korunur. Sonraki büyük sıçrama ölçümsüz yapılmaz; arama payload'ı parçalama veya sunucu tarafı indeksleme ihtiyacı yeniden değerlendirilir.

**Tamamlanma ölçütü:** 7.500 yapımlık katalog %100 erişilebilir posterle production'da çalışır; eski 2.500 Rota/Kitsu bağı değişmez, arama mobilde akıcı kalır ve otomatik/canlı kabul kapıları geçer.

### 21. ~~Ajan yetenek eşitliği~~ — production kabulüyle tamamlandı

- [x] Mevcut liste işlemlerini insan arayüzüyle eşitle: notu liste okumasında döndür, gerçek toplam ve sayfalama ekle, puanı temizlemeyi destekle ve ilerlemeyi katalogdaki bölüm sayısına göre doğrula.
- [x] İzleme günlüğünü ajanlara aç: kayıt ekleme, okuma, düzenleme ve tombstone silme; yeni günlük kaydının liste ilerlemesini yalnız ileri taşıyan mevcut davranışını koru.
- [x] Özel koleksiyonları ajanlara aç: oluşturma, okuma, ad/açıklama/renk düzenleme, anime ekleme/çıkarma/sıralama ve tombstone silme.
- [x] Kişisel önerileri ajanlara aç: mevcut açıklanabilir `Sana göre / Kısa / Film / Tek sezon / Sakin / Enerjik / Duygusal / Gizemli` yollarını ve nazik hatırlatmaları senkronize bulut kayıtlarından üret.
- [x] Her dilimde public işlem kataloğu, uç doğrulaması, `service_role` tablo yetkisi, idempotency, yerel otomasyon ve gerçek Orbit çağrısı kabulünü birlikte tamamla.

**Yetki sınırı:** Bu aşama insanın özel Rota verisinde yapabildiği işleri kendi bağlı ajanına taşır. Topluluk incelemesi yayımlama/raporlama, profil paylaşımını açma, paylaşım bağlantısını yenileme, yedek içe aktarma ve moderasyon kararları bu sıraya dahil değildir; dışa açık veya geniş etkili eylemler ayrı onay ve güvenlik tasarımı ister. Ajan yalnız buluta eşitlenmiş kayıtları görebilir, tarayıcıda kalmış yerel veriyi okuyamaz.

**Uygulama sırası:** Liste API eşitliği → izleme günlüğü → özel koleksiyonlar → kişisel öneriler.

**Tamamlanma ölçütü:** Bağlı ajan, insanın Rota'daki özel liste, günlük ve koleksiyon işlerini aynı veri bütünlüğü kurallarıyla yapabilir; senkronize geçmişten Rota'nın mevcut algoritmasıyla açıklanabilir kişisel öneri alabilir ve hiçbir işlem hayalet kimlik, eski-sürüm ezmesi veya sessiz veri kaybı üretemez.

## Sürekli bakım hattı

- [ ] Supabase Free planının duraklama, yedekleme ve kurtarma sınırlarını düzenli olarak yeniden değerlendir.
- [ ] Bağımlılık, CodeQL, RLS/RPC ve veri taşınabilirliği kontrollerini sürdür.
- [ ] Katalog/poster tazeliğini, kırık bağlantıları, erişilebilirliği ve temel performansı periyodik olarak denetle.
- [ ] AniList'in yazılı yanıtını takip et; izin ve koşullar netleşmeden 5. aşama entegrasyonuna dokunma.

Bakım hattı bağımsız bir özellik aşaması değildir; tamamlanan ürün aşamalarının ardından düşük riskli, dar turlar hâlinde yürütülür.

## Şu anki çalışma

5. aşama **MAL/AniList liste içe aktarma** başladı. Eski AniList e-posta bekleyişinin katalog kaynağı iznine ait olduğu netleştirildi; kullanıcıya ait resmî dışa aktarma dosyalarıyla cihaz içi içe aktarma bundan bağımsızdır. İlk dilim resmî MAL XML/XML.GZ ve AniList kullanıcı veri biçimini doğrulayacak, ardından kalıcı Rota kimliği eşleme ve değişikliksiz önizleme katmanını kuracaktır.

21. aşama **ajan yetenek eşitliği** production'da tamamlandı. Liste API eşitliği, izleme günlüğü CRUD'si, özel koleksiyon CRUD/üyelik/sıralaması ile sekiz açıklanabilir kişisel öneri yolu ve nazik hatırlatmalar 15 işlemlik canlı kataloğa alındı. Migration'lar ve `orbit-eylem` sürüm 6 dağıtıldı; gerçek Orbit çağrılarında sayfalama/not/puan temizleme/bölüm sınırı, günlük ve koleksiyon zincirleri ile test verisini tombstone'a alıp özgün liste durumunu geri yükleme kabulü geçti. Özellik `3f85bdc`, edge paketleme düzeltmesi `19b25a2`; Pages `32659453057`, CI `32659453063` ve CodeQL `32659453054` yeşildir.

20. aşama production'da tamamlandı: katalog 7.500 yapıma çıktı; eski 2.500 Rota/Kitsu bağı eksiksiz korundu, 7.500 poster ve 6.962 MAL eşleşmesi üretildi. Arama metni katalog yüklenirken bir kez normalize edilen istemci indeksiyle çalışıyor; benzer rotalar tür ters indeksiyle aynı sonuçları daha düşük build maliyetiyle üretiyor. `2215368` production'a yayımlandı; Pages `32621400325`, CI `32621400297` ve CodeQL `32621400320` yeşil tamamlandı. Canlı mobil kabulte Naruto araması 28 sonuç verdi; detay/benzer rotalar, yatay taşma, kırık görünür görsel ve konsol kontrolleri temizdi.

23 Ağustos ajan liste bütünlüğü turu production'da tamamlandı: ajanlar anime adını `rota.katalogdaAra` ile gerçek Rota kimliğine çözüyor, ekleme canlı katalog doğrulamasından geçiyor, liste okuma başlıklarla birlikte katalog dışı kayıtları ayırıyor ve silme tombstone ile cihazlar arasında yakınsıyor. O turdaki production kataloğu 2.500 Kitsu kimliğinin yanında Kitsu'nun sunduğu 2.195 MAL eşlemesini ayrı alan olarak yayımlıyordu; kalıcı Rota kimlikleri ve kullanıcı bağları yeniden numaralandırılmadı. `3876ed0` ile `d6f8885` production'a yayımlandı; son Pages `32618901629`, CI `32618901742` ve CodeQL `32618901585` yeşil tamamlandı. Canlı kabulde adla Naruto araması geçti, uydurma kimlik reddedildi ve üç eski hayalet kayıt tombstone'a alınarak geçersiz kayıt sayısı sıfırlandı.

İlk dört aşama ile 6–20. aşamalar tamamlandı. 20. aşama **katalog genişletmesi** `2215368` ile production'a yayımlandı: 7.500/7.500 posterli katalog, korunan 2.500 mevcut kimlik, 6.962 MAL eşleşmesi ve indeksli build/arama yolları otomatik ve canlı kabulden geçti. 5. aşamadaki MAL/AniList kullanıcı listesi içe aktarma işi bu katalog genişletmesinden ayrıdır ve beklemede kalır.

18. aşama tamamlandı: `/yillik`, günlükteki gerçek kayıtlardan ay veya yıl bazında bölüm, anime, bilinen süre, aktif gün, izleme ritmi, tür/stüdyo/puan öne çıkanları ve kişisel dönüm noktaları üretir. “Final” yalnız seçili dönemde son bölümü görülen ve bugün de `Tamamladım` durumundaki yapımlarda sayılır; geçmiş durum değişiklikleri tahmin edilmez. Veri azlığında sakin erken dönem veya boş durum gösterilir. Paylaşım kartı varsayılan kapalıdır, cihazda PNG üretilir ve anime adları için ikinci bir açık izin ister; kişisel not, hesap kimliği, tombstone veya senkronizasyon alanı karta girmez. `yearbook:check`, tam kontrol, 1.144 sayfalık build, bağımlılık denetimi ve 1.920×950 ile 390×844 yerel tarayıcı kabulü geçti. `237f460` production'a yayımlandı; Pages `32174487842`, CI `32174487772` ve CodeQL `32174487667` başarıyla tamamlandı. Canlı `/yillik` masaüstü/mobil görünüm, aylık geçiş, varsayılan kapalı kart, yatay taşma, kırık görsel ve temiz uygulama konsolu kontrollerini geçti.

17. aşama tamamlandı: `/sezonlar` yeni başlayan, devam eden ve yaklaşan yapımları seçili sezon/yıl çevresinde toplar; durum, format ve tür filtreleri ile `Planlıyorum`/`İzliyorum` eşleşmesini cihazda birleştirir. Katalog sürümü ile veri tarihi görünürdür; kesin yayın saati, bildirim, scraping veya yeni harici API bağımlılığı yoktur. `season:check`, tam kontrol/build ve 1.920×950 ile 390×844 yerel/canlı tarayıcı kabulü geçti. `d46eb7f` production'a yayımlandı; Pages `31985521359`, CI `31985521405` ve CodeQL `31985521466` başarıyla tamamlandı.

16. aşama tamamlandı: koleksiyonlar izleme durumundan bağımsız çalışır, silmeler tombstone olarak yakınsar ve JSON yedek v3 eski v1/v2 dosyalarını okumaya devam eder. `personal_collections` migration'ı sahip-kullanıcı RLS, yenisi-kazanır trigger'ı ve doğrulamalı JSON sınırıyla production'a uygulandı. Ayrı `share_collections` izni varsayılan kapalıdır; gerçek hesapla geçici `UNLISTED` kabulünde koleksiyon ve Medalist salt okunur göründü, özel kimlik/senkron alanları görünmedi. Test sonunda profil yeniden `PRIVATE`, koleksiyon paylaşımı kapalı ve geçici kayıtlar temizlenmiş durumdadır.

9. aşama tamamlandı: yüksek entropili bağlantı kodu, dar paylaşım RPC'si, alan bazlı puan/not izinleri, hesap kontrolleri ve `/paylas` salt-okunur görünümü production altyapısına taşındı. Gerçek Nyx hesabıyla `PRIVATE → UNLISTED`, bağlantıyı açma, token yenileme, eski bağlantının kapanması ve yeniden `PRIVATE` yapma akışları geçti. Son durumda test hesabının paylaşımı kapalıdır; otomatik güvenlik kontrolleri ile 1.920×950 ve 390×844 tarayıcı doğrulaması temizdir.

10. aşama tamamlandı: sahip görünümünde local-first istatistikler, paylaşılan profilde varsayılanı kapalı ayrı izin, ortak hesaplama katmanı ve regresyon kontrolü eklendi. Masaüstü/mobil sahip ile salt-okunur paylaşım ekranlarında yatay taşma veya konsol hatası görülmedi. `202608120004_personal_statistics.sql` production'a uygulandı; gerçek Nyx hesabında `PRIVATE → UNLISTED`, istatistik iznini açma, gerçek tokenlı paylaşım görünümü ve yeniden güvenli kapalı duruma dönme akışları geçti. Son durumda açık profil veya istatistik paylaşımı yoktur.

11. aşama tamamlandı: tam JSON yedeği aktif kayıtlarla tombstone geçmişini taşır; okunabilir CSV başlık, durum, ilerleme, puan ve not alanlarını içerir. Geri yükleme biçim/sürüm/alan sınırlarını doğrular ve ortak “yenisi kazanır” katmanıyla mevcut local-first arşive birleşir. Yerel otomasyon ile masaüstü/mobil görsel QA'nın ardından `639484a` production'a yayımlandı. Canlı girişli hesapta JSON/CSV indirme, 390 px taşmasız yerleşim, hatasız konsol ve aynı JSON'u değişikliksiz birleştirirken daha yeni/eşit cihaz kaydını koruma kabulü geçti; geri yükleme buluta yazma tetiklemedi.

12. aşama tamamlandı: Demon Slayer editoryal kontrolden geçti; Vinland Saga, Haikyuu!!, Bocchi the Rock!, Odd Taxi, Dungeon Meshi, Chainsaw Man, Ousama Ranking, 86, Kusuriya no Hitorigoto, Cyberpunk: Edgerunners ve Dandadan için özgün spoiler kontrollü profiller eklendi. Toplam 20 yayımlanmış profil beş tematik seçkiye ayrıldı; ana sayfa seçkisi her pazartesi otomatik değişir ve kullanıcı diğer seçkilere elle geçebilir. İçerik doğrulaması profil sayısını, spoiler onayını, bağlantı/yinelenen cümle yasağını ve her profilin rotasyonda tam bir kez yer almasını korur. `a792e4e` production'a yayımlandı; GitHub Pages çalıştırması `31652279533` başarıyla tamamlandı. Canlı domainde beş seçkinin tamamı, masaüstü ve 390 px mobil raf düzeni ile Vinland Saga'nın tam editoryal profili doğrulandı.

Kalıcı giriş **12 Ağustos 2026'da Equinox Orbit'e taşındı**: Supabase'de `custom:orbit` adlı OIDC sağlayıcısı, issuer `https://orbit.sametbasbug.dev`, kapsamlar `openid email profile`, PKCE akışı. Google girişi tamamen kaldırıldı — düğme, betik, ortam değişkeni ve Supabase'deki sağlayıcı kaydı dahil. Geçiş penceresi bırakılmadı; site halka duyurulmamıştı ve mevcut hesaplar ürün sahibinin test hesaplarıydı. Mevcut Google kimliği e-posta eşleşmesiyle aynı kullanıcıya bağlandı, ikinci hesap açılmadı. Production'da uçtan uca giriş doğrulandı.

Supabase Auth ve RLS bırakılmadı: `profiles`, `personal_list_entries`, politikalar ve `cloud-sync.ts` değişmedi. Değişen tek şey kimliğin nereden geldiği.

Senkronizasyon katmanı ardından sağlamlaştırıldı: sürüm karşılaştırması PostgREST ile yerel kaydın zaman biçimi farkına takılmıyor, gönderim parçalı yapılıyor, sunucunun reddettiği kayıt yalıtılıp cihazda korunuyor ve başlık rozetinde ayrıca bildiriliyor. İki cihazlı yakınsama otomasyonu genişletildi; eşzamanlı yüklemede eski sürümün yeniyi ezmesini önleyen veritabanı migration'ı production'a uygulandı ve canlı sorguyla doğrulandı.

Resend Free'nin günlük 100 e-posta sınırı nedeniyle her girişte kota tüketen magic-link modeli kaldırıldı. Supabase e-posta sağlayıcısı, özel SMTP ve CAPTCHA koruması kapatıldı; Rota'ya özel Resend anahtarı, Cloudflare Turnstile bileşeni ve GitHub Pages değişkeni silindi. Hesapsız local-first kullanım korunur.

İki fiziksel cihazda canlı eşitleme çalıştı ve Samet bunu ürün kabulü için yeterli saydı. Rota çevrimdışı açılma veya gezinme vadeden bir PWA olmadığı için “çevrimdışı site kullanımı” ayrı kapanış şartı değildir. Cihazlar arası güncelleme, eşzamanlı yakınsama ve tombstone silme davranışları otomatik testlerle; eski sürümün yeniyi ezmemesi production trigger'ıyla korunur. Kısmi-red bildirimi kontrollü, sunucuda kalıcılaşmayan geçersiz bir yerel kayıtla gerçek production oturumunda doğrulandı: başlık rozeti, sorun sayacı, açıklayıcı mesaj ve Rota'nın hata hâli doğru çalıştı; test kaydı ardından cihazdan temizlendi.

Ürün deneyimi baştan aşağı **Soft Celestial Otaku** sistemine geçirildi: açık manga editoryali, kontrollü asimetri, koleksiyon rafları, otaku köşesi hesap ekranı ve yaşayan göksel yoldaş eklendi. Yoldaşın adı **Rota** olarak ürün anlatısına bağlandı; sabit yüz anatomisi site ikonu, favicon ve paylaşım kimliğinin ortak marka paydasıdır. Ana sayfada arama ile kişisel dönüş ilk görüş alanında; katalog Türkçe filtrelerle, anime detayı manga açılımıyla, Listem ise durumlara ayrılan raflarla çalışır. Mevsimsel renk katmanı, erişilebilir mikro animasyonlar ve sayfa geçişleri aynı marka dilini taşır. Kanonik tasarım ilkeleri `docs/DESIGN_DIRECTION.md` içindedir.

Rota'nın karakter dili ana ekranlar, paylaşım ve sistem durumlarına ayrılan 100'ü aşkın kısa replikle genişletildi; aynı sahnenin son sözü oturum içinde art arda tekrarlanmaz. Hesap ekranındaki görünen ad düzenleyicisi kaldırıldı: adın tek kaynağı Orbit OIDC kimliğidir, Rota yalnız paylaşılan raf ve incelemeler için yerel bir kopya tutar.

Bu katman `504a2ff` ve `89e9af3` ile production'a yayımlandı. Orbit adını yerel profile taşıyan trigger ile sütun/fonksiyon yetki sınırları canlı sorguyla; Rota replikleri ve yeni salt-okunur hesap kartı masaüstü/mobil canlı tarayıcı kabulüyle doğrulandı.

Katalog üretimi ayrıca veri bütünlüğü için sağlamlaştırıldı: aynı başlık/yıl/formatta kalan kesin upstream kopyalar tek kanonik kayıtta birleştiriliyor ve seçkiye giren açık sezon devamlarının mevcut önceki sezonları 900 kayıt sınırı içinde korunuyor. TMDB görsel eşleştiricisi açık sezonları normal aramadan önce seri soyundan çözüyor, sezon görsellerini tercih ediyor ve TMDB ile anime sezon modelinin uyuşmadığı doğrulanmış istisnalar için ayrı manuel override katmanı kullanıyor.

Public yayın modeli de kilitlendi: GitHub deposu public olacak; uygulama kodu AGPL-3.0-only altında, özgün editoryal içerik ile Rota/Equinox marka katmanı korumalı kalacak ve katalog verisinin ODbL/DbCL koşulları ayrı sürdürülecek.

`sametbasbug/anime.sametbasbug.dev` public reposu, GitHub Actions Pages hattı ve `https://anime.sametbasbug.dev/` özel domain'i HTTPS ile canlıdır. Production build için yalnız Supabase publishable değerleri repo değişkeni olarak sağlanır; giriş için siteye ait ayrı bir istemci kimliği gerekmiyor, çünkü kimlik Orbit'ten geliyor. Eski `PUBLIC_GOOGLE_CLIENT_ID` değişkeni repo ayarlarından da kaldırılmıştır. Repo kalite hattı CI, CodeQL ve Dependabot ile korunur.
