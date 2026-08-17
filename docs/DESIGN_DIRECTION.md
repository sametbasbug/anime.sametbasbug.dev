# Equinox Rota tasarım yönü

**Durum:** Onaylandı  
**Karar tarihi:** 9 Ağustos 2026  
**Kanonik yön:** Soft Celestial Otaku — manga editoryali ile kişisel anime köşesi

## Ürün cümlesi

Equinox Rota sıradan bir film kataloğu değil; kullanıcının anime yolculuğunu keşfettiği, kaydettiği ve sahiplenebildiği kişisel otaku köşesidir.

Tasarımın başarı testi şudur:

> Anime görselleri geçici olarak kaldırıldığında bile arayüz bir film/veri tabanı sitesine değil, anime ve manga kültürüne ait hissettirmelidir.

## Ürün hissi

- Varsayılan deneyim açık, ferah, sıcak ve neşelidir. Karanlık tema ana kimlik değildir.
- Görsel dil modern manga editoryali, koleksiyon rafı ve yumuşak göksel motifleri birleştirir.
- Sevimlilik; yuvarlak formlar, canlı renkler, küçük sürprizler ve samimi metinlerle kurulur. Çocukça veya yapay “kawaii” klişesine dönüşmez.
- Anime görselleri dekor değil, içerik hiyerarşisinin başrolüdür.
- Arayüz canlıdır ama kullanıcının arama, kaydetme ve bölüm ilerletme işlerini geciktirmez.

## İfade seviyesi — cesur kawaii

- Kawaii seviyesi bilinçli biçimde yüksektir; sevimlilik yalnız küçük ikonlara değil kompozisyonun kendisine taşınır.
- Klasik web sitesi kalıpları zorunlu değildir. Kontrollü asimetri, üst üste binen kartlar, manga efektleri, sticker katmanları ve alışılmadık bölüm geçişleri teşvik edilir.
- Her ana ekranda kullanıcıya “bunu başka bir sitede görmedim” dedirtecek en az bir karakterli an bulunmalıdır.
- **Rota**, ürünün göksel yoldaşı ve marka yüzüdür. Arayüzde rehber ve duygu işareti olarak kullanılır; işlevin veya anime içeriğinin önüne geçmez.
- Hareket kısa, neşeli ve amaçlıdır. `prefers-reduced-motion` her zaman korunur.
- Yüksek ifade, düşük kullanılabilirlik bahanesi değildir: metin kontrastı, 44 piksel dokunma hedefleri ve hızlı tarama korunur.

## Görsel sistem

### Renk

- **Süt beyazı / sıcak kâğıt:** ana zemin
- **Mürekkep moru:** metin ve güçlü kontur
- **Equinox lavantası:** marka ve birincil eylemler
- **Sakura mercanı:** duygu, favori ve sıcak vurgu
- **Gökyüzü mavisi, mint ve güneş sarısı:** kategori ve durum renkleri
- Koyu yüzeyler yalnız kontrast gereken küçük alanlarda veya ileride isteğe bağlı gece temasında kullanılır.

### Biçim

- Manga panellerini çağrıştıran belirgin ama yumuşatılmış çerçeveler
- Sticker/rozet gibi davranan etiketler
- İnce benek, yıldız, hız çizgisi ve konuşma balonu detayları
- Yuvarlatılmış kartlar; kontrollü asimetri ve hafif dönüşler
- Büyük siyah sinema blokları, ağır cam efekti ve kurumsal dashboard kutuları kullanılmaz.

### Tipografi ve metin

- Başlıklarda dost canlısı, yuvarlak ve enerjik bir ritim
- Uzun anime adlarında okunabilir ölçek ve doğal satır kırılımı
- Japonca yalnız gerçek içerik veya küçük atmosfer detayı olarak kullanılır; anlamsız karakter süslemesi yapılmaz.
- Metinler “kullanıcı hesabı” gibi kurumsal değil, “senin köşen / sıradaki bölüm / koleksiyonun” gibi kişisel konuşur.

## Bilgi mimarisi

Masaüstü üst gezinmesi ürünün tüm ana bölümlerini doğrudan gösterir. Mobilde sabit alt gezinme dört sık kullanılan hedefi korur:

- **Ana:** kişisel dönüş, güncel sezon ve keşif
- **Keşfet:** arama, tür, format, durum ve stüdyo yolları
- **Listem:** izleme durumu, bölüm ilerlemesi ve kişisel notlar
- **Günlük:** izlenen bölüm kayıtları ve aylık hafıza

Alt gezinmedeki beşinci **Menü** kontrolü; Sezonlar, Bana seç, Rehberler ve Koleksiyonlar dâhil masaüstündeki tüm ürün duraklarını erişilebilir bir panelde açar. Yeni kalıcı bölüm yalnız masaüstü menüsüne eklenmez; aynı ortak bağlantı kaynağı mobil tam menüyü de besler. Hesap kontrolü masaüstünde olduğu gibi mobil header'da ayrı durur.

## Ekran ilkeleri

### Ana sayfa

- İlk ekranda güçlü anime kimliği, arama ve tek bir güncel keşif bulunur.
- Kullanıcının kişisel listesi “arşiv özeti” değil, geri dönmek isteyeceği kişisel bir köşe gibi sunulur.
- Türler kuru sayılarla değil, ruh hali ve izleme isteği üzerinden keşfedilir.

### Keşfet

- Arama ilk görüş alanındadır.
- Filtreler kolay, Türkçe ve dokunmatik kullanıma uygundur.
- Kartlar poster ızgarası gibi anonim durmaz; renk, etiket ve mikro detaylarla koleksiyon hissi verir.

### Anime detayı

- Yapımın atmosferi, temel bilgileri ve `Listeme ekle` eylemi aynı kompozisyonda görünür.
- İçerik manga sayfası ritmiyle bölünür; veri dökümü görünümünden kaçınılır.
- Mobilde başlık ve kişisel liste eylemi görselden önce gelir.

### Listem

- Bir yönetim tablosu değil, kullanıcının anime rafıdır.
- Durum renkleri, bölüm ilerlemesi ve notlar hızlı taranır.
- Temel kontroller en az 44 piksel dokunma hedefi taşır.

### Hesap

- Kuru ayar ve giriş ekranı değildir; kullanıcının “otaku köşesi”dir.
- Giriş yapmadan önce cihazdaki koleksiyon ve local-first güven görünürdür.
- Giriş yaptıktan sonra profil, kayıt sayısı, senkronizasyon durumu ve gizlilik tek bakışta anlaşılır.
- E-posta yardımcı kimlik bilgisidir; ekranın ana başlığı yapılmaz.

## Kaçınılacaklar

- Netflix/Letterboxd benzeri karanlık sinema estetiği
- Kurumsal admin paneli veya soğuk veri tabanı görünümü
- Anime kapaklarını sıradan film posterleri gibi dizmek
- Her yere pembe, neon veya anlamsız Japonca basmak
- Aşırı maskotlaştırma ve yapay “senpai/kawaii” dili
- Viewport'u kaplayan marka manifestoları
- İşlevsiz dekor, düşük kontrast ve küçük dokunma hedefleri

## Yaşayan Rota sistemi

- Göksel yoldaşın adı **Rota**'dır. Kullanıcı kendi anime rotasını çizerken Rota ona eşlik eder; ürün adı, karakter ve anlatı bu ortak paydada buluşur.
- Rota'nın lavanta gövdesi, taç-kulak silueti, güneş sarısı hilal kuyruğu, mürekkep konturu ve yıldız izi sabittir. Durumlar karakterin rengini veya anatomisini değiştirmez; yalnız mimik, hareket ve geçici aksesuar ekler.
- Header işareti, favicon ve paylaşım kimliği Rota'nın aynı yüz anatomisinden türetilir. Yeni marka ikonları ayrı bir sembol icat etmez.
- Göksel yoldaşın temel hâlleri `happy`, `curious`, `sleepy`, `syncing`, `celebrating` ve `error` olarak tanımlıdır.
- Yoldaş; boş raf, yükleme, hata, hesap senkronizasyonu ve anime tamamlama anlarında bağlama göre tepki verir. Durum iletisini destekler, tek başına durumun tek göstergesi olmaz.
- Konuşma balonu karakter animasyonundan bağımsız ve keskin kalır; gövdeyle birlikte ölçeklenmez. Balon metni mobil ve masaüstünde en az 12 piksel, yüksek kontrastlı ve kısa olmalıdır.
- Rota aynı ekranda tek bir ezber cümleyi tekrarlamaz. Ana sayfa, keşif, kişisel raf, detay, hesap, paylaşım ve sistem durumlarının ayrı kısa replik havuzları vardır; aynı sahnenin son repliği oturum içinde art arda seçilmez.
- Rota kendini nadiren tanıtır; balondaki küçük `Rota` imzası konuşanın kimliğini kurar. Metin samimi Türkçedir, yapay “senpai/kawaii” diline kaçmaz.
- Sayfa geçişleri kısa bir göksel manga işareti ve yumuşak içerik geçişi kullanır. Desteklenmeyen tarayıcılarda normal gezinme korunur.
- Mevsim katmanı yalnız vurgu rengi ve arka plan ışıltısını değiştirir; içerik düzeni veya okunabilirlik mevsime göre değişmez.
- `prefers-reduced-motion` açıkken yoldaş, kutlama ve sayfa geçişi animasyonları durur.
- Masaüstü hassas işaretçide yıldız/kalp detaylı Rota cursor'ları kullanılır; dokunmatik cihazlarda sistem imleci korunur. Metin alanı ve devre dışı kontrol gibi semantik cursor durumları dekor uğruna ezilmez.
- Dikey scrollbar lavanta–sakura renklerini taşır; ince, yüksek kontrastlı ve platformun doğal kaydırma davranışını bozmayan bir görsel katmandır.

## İzleme günlüğü

- Günlük, liste rafının kopyası değildir; tarih, bölüm aralığı ve kısa kişisel hafıza etrafında kurulan ayrı bir defter yüzeyidir.
- Aylık özet ve takvim yoğunluk gösterir ancak rekabetçi seri, rozet veya suçluluk üreten devam serileri kullanmaz.
- Anime detayındaki hızlı kayıt ilerlemeyi yalnız ileri taşır; geçmiş bir günlüğü düzenlemek mevcut liste ilerlemesini geriye çekmez.
- Günlük notları özel kalır ve paylaşılabilir profil yüzeyine kendiliğinden taşınmaz.

## Paylaşım kimliği

- Varsayılan Open Graph/Twitter kartı `public/social/equinox-rota-share.png` dosyasıdır; düzenlenebilir kaynak SVG aynı klasörde tutulur.
- Tüm sayfalar kanonik URL, Türkçe açıklama, 1200×630 paylaşım görseli ve erişilebilir görsel açıklaması üretir.
- Paylaşım kartı Rota'yı, manga panelini ve açık pastel kimliği birlikte taşır; anime kapağı kullanım hakkı doğrulanmadan harici görsel kullanmaz.
- Yeni özel paylaşım görselleri `BaseLayout` üzerindeki `image`, `imageAlt` ve `type` alanlarıyla tanımlanır.

Bu belge, tüm yeni arayüz kararlarının kanonik kaynağıdır. Ürün aşamaları `ROADMAP.md`, hesap güvenliği ise `docs/ACCOUNT_ARCHITECTURE.md` tarafından yönetilir.
