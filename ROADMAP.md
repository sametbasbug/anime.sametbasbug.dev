# Rota ürün yol haritası

Bu belge, Samet ile Nyx'in 6 Ağustos 2026'da onayladığı ürün sırasını korur. Rota'nın geçici adı veya teknik ayrıntıları değişse bile temel öncelik, topluluk özelliklerinden önce güçlü bir kişisel anime keşif ve takip ürünü oluşturmaktır.

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
- [x] İşlem e-postası göndericisini `Rota <giris@anime.sametbasbug.dev>` olarak seç.
- [ ] `anime.sametbasbug.dev` alan adını Resend'de doğrula ve özel SMTP'yi yapılandır.
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

### 7. Marka ve yayın

- `Rota` adını ürün omurgası doğrulandıktan sonra kesinleştir veya değiştir.
- Logo, domain, üretim altyapısı ve yayın kararlarını birlikte ele al.
- [x] GitHub deposunun public olacağını; kodun AGPL-3.0-only, özgün içerik ve markanın korumalı olacağını kararlaştır.
- [x] Kanonik repo adını `sametbasbug/anime.sametbasbug.dev`, korunan katmanın hak sahibini Samet Başbuğ olarak belirle.
- Push, deploy, domain veya dış hesap işlemleri için Samet'in açık onayını al.

## Şu anki çalışma

İlk üç aşama tamamlandı. Dördüncü aşama Supabase Free üzerinde çalışıyor: şifresiz giriş, profil/gizlilik yazımı, yedi sahip-kullanıcı RLS politikası ve cihazlar arası liste birleştirme iki bağımsız tarayıcı profiliyle doğrulandı. GitHub Pages, `anime.sametbasbug.dev` ve `Rota <giris@anime.sametbasbug.dev>` kararları kilitlendi; uygulama yarına bırakıldı.

Senkronizasyon katmanı ardından sağlamlaştırıldı: sürüm karşılaştırması PostgREST ile yerel kaydın zaman biçimi farkına takılmıyor, gönderim parçalı yapılıyor, sunucunun reddettiği kayıt yalıtılıp cihazda korunuyor ve başlık rozetinde ayrıca bildiriliyor.

Aşamanın kapanması için push/deploy, DNS/Resend özel SMTP kurulumu ile iki fiziksel cihazda çevrimdışı düzenleme ve silme testi gerekiyor. O turda iki şeye ayrıca bakılacak: ikinci eşitlemede gönderilen kayıt sayısının sıfıra düşmesi ve kısmi red bildiriminin gerçek oturumdaki görünümü.

Public yayın modeli de kilitlendi: GitHub deposu public olacak; uygulama kodu AGPL-3.0-only altında, özgün editoryal içerik ile Rota/Equinox marka katmanı korumalı kalacak ve katalog verisinin ODbL/DbCL koşulları ayrı sürdürülecek.
