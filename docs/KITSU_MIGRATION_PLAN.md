# Kitsu katalog geçiş planı

Durum: **production kabulüyle tamamlandı**
Karar tarihi: **18 Ağustos 2026**  
İlgili yol haritası: **19. aşama — Kitsu katalog geçişi**

## 1. Amaç

Equinox Rota'nın anime bilgileri ile poster/kapak görsellerinde kullandığı iki ayrı upstream hattı kaldırılacak:

- `manami-project/anime-offline-database` katalog üretimi,
- TMDB başlık/yıl/tür eşleştirmesi ve manuel poster override'ları.

Yerlerine **tek harici anime kaynağı olarak Kitsu API ve Kitsu media CDN** kullanılacak. Geçişin ana ürün ölçütü yalnız teknik olarak çalışan bir istek değil; halka açık katalog kartları ve detay sayfalarında **%100 geçerli görsel kapsaması**dır. 743/900 veya benzeri kısmi poster oranı kabul sayılmaz.

## 2. Hedef mimari

### Kaynak sınırı

- Anime metadatasının harici otoritesi Kitsu olur.
- Poster ve kapak URL'leri Kitsu'nun döndürdüğü media alanlarından gelir.
- Görsel dosyaları repoya, Supabase'e veya başka bir Rota deposuna indirilmez.
- Kitsu'nun ham API yanıtları aynalanmaz ve kalıcı bir ham veri arşivi tutulmaz.
- TMDB, Manami, MAL scraping veya ikinci bir görsel sağlayıcı fallback olarak çalıştırılmaz.

### Statik site gerçeği

Rota GitHub Pages üzerinde Astro static build olarak yayımlanıyor. Bu nedenle API'yi her kart açılışında tarayıcıdan çağırmak; 2.500 statik detay rotasını, aramayı, sezon panosunu, önerileri ve kişisel istatistikleri gereksiz biçimde Kitsu erişimine bağlar.

Hedef akış şöyledir:

1. `data:refresh` Kitsu API'yi çağırır.
2. Yalnız Rota'nın kullandığı alanları ortak `CatalogueAnime` şemasına normalize eder.
3. Statik build için sürümlü, küçük bir Rota katalog snapshot'ı üretir.
4. Poster/kapak dosyalarını kopyalamaz; yalnız Kitsu CDN URL'lerini taşır.
5. Kullanıcı tarayıcısı sayfa verisini Rota'nın statik çıktısından, görselleri Kitsu CDN'den alır.

Bu snapshot Kitsu veritabanının bir kopyası değil, Rota'nın statik sayfaları ve local-first özellikleri için gereken ürün indeksidir. Hiç metadata snapshot'ı tutmamak istenirse GitHub Pages/static route modeli ayrıca SSR veya edge altyapısına taşınmak zorundadır; bu altyapı değişikliği bu geçişin kapsamına dahil değildir.

### Kimlik modeli

- Kitsu ID, upstream kaydı belirleyen kanonik sağlayıcı kimliği olur.
- Mevcut Rota `anime.id` değerleri ilk geçişte değiştirilmez.
- Her kayda ayrı `kitsuId` alanı eklenir.
- Güvenli eşleşen 797 eski yapımın Rota kimliği ve slug'ı korunur. Güvenli eşleşmeyen veya Kitsu görsel kapısını geçmeyen 103 eski kayıt, ürün sahibinin onayıyla seçkiden çıkarılır.
- Rota `id` alanı dış sağlayıcı kimliği değildir: eski kayıt bağlarını koruyan kalıcı ve opak ürün kimliğidir. Her kaydın `kitsuId` alanı ayrı tutulur; Kitsu mapping ilişkisinde mevcutsa `malId` ayrıca yayımlanır. Ajanlar bu alanlardan kimlik tahmin etmek yerine katalog arama işleminin döndürdüğü Rota `animeId` değerini kullanır.
- Yeni kayıtlar çakışmasız `kitsu-<id>` biçiminde Rota kimliği alır.
- Kişisel liste, günlük, koleksiyon, paylaşım, inceleme ve editoryal içerik bağları Rota kimliğiyle çalışmaya devam eder.

Bu ayrım sayesinde veri kaynağı Kitsu'ya geçerken kullanıcı veritabanında toplu ve riskli bir anime ID migration'ı gerekmez.

## 3. Alan eşlemesi

| Rota alanı | Kitsu karşılığı | Dönüşüm |
| --- | --- | --- |
| `kitsuId` | anime ID | String olarak saklanır. |
| `title` | İngilizce başlık → canonical fallback | İngilizce karşılık varsa ana başlık olur; yoksa Kitsu canonical değeri kullanılır ve boş olamaz. |
| `titleEnglish` | `titles.en` / bölgesel İngilizce alanı | Varsa korunur; bulunmadığında `null`, tahmin yoktur. |
| `titleRomaji` | `titles.en_jp` | Varsa romanize Japonca başlık olarak korunur. |
| `titleNative` | `titles.ja_jp` | Varsa özgün Japonca başlık olarak korunur. |
| `synonyms` | Canonical, İngilizce, Japonca, romanize ve kısaltılmış başlıklar | Görünen ana başlık çıkarılarak tekilleştirilir ve ürün sınırına kırpılır. |
| `type` | subtype | Rota'nın `TV`, `MOVIE`, `OVA`, `ONA`, `SPECIAL` değerlerine eşlenir. |
| `status` | status | `FINISHED`, `ONGOING`, `UPCOMING` değerlerine normalize edilir. |
| `episodes` | episode count | Bilinmiyorsa `0`; kişisel ilerleme sınırı uydurulmaz. |
| `durationSeconds` | episode length | Dakika değeri saniyeye çevrilir. |
| `score` | average rating | 100'lük değer 10'luk Rota ölçeğine çevrilir. |
| `season` | start date | Ay ve yıldan mevsim türetilir; belirsizlik korunur. |
| `tags` | genres/categories | Türkçe etiket katmanı mevcut Rota eşlemesiyle uygulanır. |
| `studios` | production/studio ilişkileri | Yalnız doğrulanmış stüdyo ilişkileri alınır. |
| `poster` | poster image varyantları | Küçük/orta/büyük/orijinal URL'ler ve `srcset` üretilir. |
| `cover` | cover image varyantları | Detay hero alanında kullanılmak üzere isteğe bağlıdır. |
| `sources` | Kitsu anime URL'si | Kaynak alanı yalnız Kitsu'yu gösterir. |

Kitsu synopsis metni otomatik biçimde Türkçe editoryal içerik yerine geçirilmez. Mevcut özgün, spoiler kontrollü Rota metinleri katalog yenilemesinden bağımsız kalır.

## 4. Uygulama aşamaları

### A. API sözleşmesi ve küçük teknik doğrulama

- Güncel Kitsu GraphQL ve REST yüzeylerinde gereken alanların varlığını doğrula.
- GraphQL tam alan ve ilişki kapsaması sağlıyorsa ana taşıma olarak onu seç; REST'i yalnız geçiş araştırmasında karşılaştır.
- CORS, sayfalama, oran limiti, `Retry-After`, timeout ve media CDN davranışını kaydet.
- En fazla üç kontrollü deneme ve düşük eşzamanlılıkla 429/5xx davranışını ölç.
- Güncel kullanım koşulları, atıf beklentisi ve API kimliklendirme gereksinimini README'de uygulanabilir biçimde belgelemek için doğrula.

**Çıkış kapısı:** API taşıması, alan sözleşmesi ve hata davranışı belirsizse üretim koduna geçilmez.

### B. Kitsu adapter'ı ve normalize şema

- Kitsu'ya özgü istek/yanıt tiplerini tek bir adapter modülünde tut.
- `CatalogueAnime` içine `kitsuId`, çok boyutlu Kitsu görseli ve isteğe bağlı cover alanlarını ekle.
- Tür, durum, tarih, puan, bölüm süresi, türler ve stüdyolar için saf dönüştürücüler yaz.
- Eksik ilişki veya alanı sahte değerle doldurma; belirsizliği açıkça koru.
- Ham API nesnelerinin UI bileşenlerine sızmasını engelle.

**Çıkış kapısı:** Şema kontrolleri ile örnek TV, film, OVA, devam sezonu, yaklaşan ve tarihi belirsiz kayıtlar geçer.

### C. Mevcut 900 kaydı eşleme

- Önce mevcut `sources` içindeki kesin `kitsu.app/anime/<id>` bağlantılarını kullan.
- Kitsu bağlantısı olmayan kayıtlarda başlık + yıl + format eşleşmesi yap.
- Belirsiz, birden çok sonuca giden veya medya tipi uyuşmayan eşleşmeleri otomatik kabul etme.
- Sonuç raporunda `exact`, `review`, `unmatched`, `duplicate` ve `missing-media` sayılarını ayrı göster.
- 50 yayımlanmış editoryal profilin tamamının aynı Rota kimliğine bağlı kaldığını doğrula.

**Sonuç:** 797 eski Rota kimliği deterministik biçimde Kitsu'ya bağlandı; 103 güvensiz/postersiz kayıt değiştirildi. 50 yayımlanmış editoryal bağın tamamı korundu.

### D. Görsel hattını değiştirme

- `AnimeArtwork` sabit TMDB base URL'sini bırakır; Kitsu'nun tam poster URL'lerini kullanır.
- Kartlarda uygun küçük/orta boy, detay sayfasında büyük boy ve responsive `srcset` kullan.
- Poster ve cover için yükleme, bozuk URL, içerik tipi ve minimum boyut kontrolleri ekle.
- Görsel hatasında yerleşimi bozmayan Rota fallback'i korunur; fakat geçiş kabulü fallback'in normal katalog öğelerinde görünmesine izin vermez.
- Public katalogda yer alacak her kaydın geçerli bir Kitsu posterine sahip olması zorunlu olur.

**Çıkış kapısı:** Yayın adayında poster kapsaması **%100**, kırık görsel sayısı **0** olur. Kitsu'da görseli olmayan kayıtlar sessizce kabul edilmez; kesim kararı ayrıca raporlanır.

### E. Gölge katalog ve ürün regresyonu

- Eski ve Kitsu kataloglarını aynı commit içinde ayrı çıktılar olarak üretip alan fark raporu al.
- Başlık, bölüm, durum, sezon, süre, puan, tür ve stüdyo kayıplarını ölç.
- Arama sıralaması Kitsu alanlarına göre yeniden kalibre edilir; eski `sources.length` kalite sinyali kaldırılır.
- Tür/stüdyo sayfaları, benzer yapımlar, sezon panosu, öneriler, istatistikler ve yıllık Kitsu şemasıyla doğrulanır.
- Mevcut kişisel liste, günlük, koleksiyon, paylaşım ve topluluk kayıtlarının aynı animeye bağlandığı test edilir.
- Korunan 797 anime URL'sinin HTTP 200 kalması sağlanır; değiştirilen 103 kayıt kabul raporunda açıkça belirtilir.

**Çıkış kapısı:** Bütün otomatik kontroller ve tam static build geçmeden kaynak seçimi değiştirilmez.

### F. Kesim ve production kabulü

- Kaynak seçimini tek noktadan Kitsu adapter'ına geçir.
- Manami ve TMDB atıflarını ancak production artık onları kullanmadığında kaldır.
- Masaüstü 1.920×950 ve mobil 390×844 kabulünde ana sayfa, arama, detay, tür, stüdyo, sezonlar, listem, öneriler ve yıllık kontrol edilir.
- Ağ panelinde TMDB görsel isteği ve Manami veri bağımlılığı kalmadığını doğrula.
- Kitsu posterlerinin doğru animeye ait olduğu popüler, devam sezonu, film ve eski yapım örneklerinde görsel olarak incelenir.
- Push/deploy için ayrıca Samet'in açık onayı alınır.

**Çıkış kapısı:** %100 poster, sıfır kırık görsel, korunmuş kullanıcı bağları, temiz konsol, temiz kontrol/build ve production smoke testi.

### G. Eski hattı kaldırma

- `refresh-tmdb-posters.mjs`, TMDB override ve poster snapshot dosyalarını kaldır.
- Manami indirme/lisans doğrulama yolunu ve yalnız ona ait kaynak etiketlerini kaldır.
- Paket script'lerini, README katalog bölümünü, attribution bileşenini ve kalite kontrollerini Kitsu'ya göre sadeleştir.
- Geri dönüş için ayrı runtime kodu tutulmaz; son sağlam commit/tag ve git geçmişi yeterlidir.

Bu temizlik production kabulünden önce yapılmaz.

## 5. Yenileme ve hata politikası

- API istekleri timeout'lu, düşük eşzamanlı ve sınırlı retry'lıdır.
- 429 yanıtında `Retry-After` uygulanır; aynı hata kör biçimde tekrarlanmaz.
- Eksik sayfa, schema değişimi, kayıt sayısında açıklanamayan sert düşüş veya poster kapsamasında azalma yenilemeyi başarısız yapar.
- Başarısız yenileme mevcut sağlam katalog snapshot'ını ezmez.
- Her yenileme kaynak zamanı, çekilen kayıt sayısı, kabul/red sayısı, poster kapsaması ve şema sürümünü raporlar.
- Kitsu API'nin anlık erişilemezliği mevcut statik siteyi bozmaz; yalnız yeni katalog yenilemesi durur. Kitsu media CDN kesintisi için UI fallback'i çalışır.
- Kalıcı scheduler bu planın parçası olarak kendiliğinden oluşturulmaz; yenileme sıklığı ilk production turundan sonra ayrıca kararlaştırılır.

## 6. Kabul ölçütleri

- [x] Harici anime metadata ve görsel kaynağı yalnız Kitsu.
- [x] Ham Kitsu yanıtı ve görsel dosyası repoda veya Supabase'de tutulmuyor.
- [x] Public katalogdaki 2.500 animenin tamamı Kitsu posterine sahip: **%100**.
- [x] 2.500 poster URL'si erişilebilir: **%100** (bir timeout kontrollü tekrarında geçti).
- [x] Güvenli eşleşen 797 eski anime URL'si ve Rota kimliği korunuyor; 103 değişiklik kayıtlı.
- [x] 50 yayımlanmış editoryal profil doğru animeye bağlı.
- [x] Korunan kimliklerde kişisel liste, günlük, koleksiyon, paylaşım ve inceleme bağları değişmiyor.
- [x] Arama, tür, stüdyo, benzer yapım, sezon, öneri, istatistik ve yıllık kontrolleri geçiyor.
- [x] `npm run check`, `npm run build`, `npm audit` ve `git diff --check` temiz; build 2.627 statik sayfa üretiyor.
- [x] 1.920×950 ve 390×844 gerçek tarayıcı kabulü temiz; ana sayfa, Naruto araması ve detay rotasında yatay taşma yok, yüklenen Kitsu görselleri başarılı.
- [x] README, attribution, kullanım koşulları ve veri kaynağı metinleri Kitsu yayın adayıyla uyumlu.

## 7. Kapsam dışı

- MAL/AniList kullanıcı listesi içe aktarma.
- Kitsu'ya kullanıcı listesi yazma veya iki yönlü senkronizasyon.
- Kitsu yorumlarını, kullanıcı profillerini ya da sosyal özelliklerini Rota'ya taşıma.
- Harici synopsis metinlerini otomatik çevirip editoryal içerik olarak yayımlama.
- GitHub Pages'ten SSR/edge platformuna geçiş.
- Otomatik cron/scheduler veya yeni kalıcı altyapı kurma.

## 8. Geri dönüş ölçütü

Kesimden sonra ciddi yanlış eşleşme, korunan kullanıcı bağının kopması, poster kapsamasının %100'ün altına düşmesi veya Kitsu şema değişikliğinin üretimi bozması hâlinde son sağlam production commit'ine dönülür. Eski Manami/TMDB runtime hattı kaldırılmıştır; geri dönüş git geçmişindeki son sağlam production commit'i üzerinden yapılır.
