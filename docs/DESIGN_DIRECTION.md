# Equinox Rota tasarım yönü

**Durum:** Onaylandı  
**Karar tarihi:** 9 Ağustos 2026  
**Kanonik yön:** Sinematik kişisel anime arşivi

## Ürün hissi

Equinox Rota bir editoryal afiş veya katalog vitrini gibi değil, her gün kullanılabilen kişisel bir anime arşivi gibi davranmalıdır. Arayüz sinematik ve karakterli kalırken temel işlemler dekoratif anlatının önüne geçer.

- Ana zemin koyu grafit; içerik yüzeyleri daha açık grafit tonlarında kurulur.
- Mercan, Equinox Rota'nın kalıcı marka vurgusudur. Asit sarısı yalnız durum ve güçlü eylemlerde kullanılır.
- Anime kartları tek bir bej şablona sıkışmaz; mevcut hakları güvenli temsili görsel sistemi yapım başına değişen renk ve atmosfer üretir.
- Büyük tipografi kısa marka anlarında kullanılır. Uzun başlıklar, açıklamalar ve kontroller öncelikle okunabilir olmalıdır.
- Keskin editoryal çizgiler korunur; fakat boşluk, ölçek ve tipografi kullanıcının işini geciktiremez.

## Ürün öncelikleri

1. Kullanıcı ilk bakışta anime arayabilmeli veya kişisel listesine dönebilmelidir.
2. Giriş yapan kullanıcıya ana sayfada listesi ve devam edebileceği yapımlar görünmelidir.
3. Katalogda arama ve filtreler sayfanın ilk işlevsel alanıdır; tanıtım metni ikincildir.
4. Anime detayında kapak, kısa bağlam, puan, bölüm, durum ve `Listeme ekle` aynı görüş alanında bulunmalıdır.
5. Kişisel listede durum ve bölüm ilerlemesi doğrudan, hızlı ve dokunmatik kullanıma uygun düzenlenmelidir.

## Bilgi mimarisi

Ana gezinme dört kalıcı hedef taşır:

- **Ana Sayfa:** kişisel özet ve güncel seçkiler
- **Keşfet:** arama, filtreleme, türler ve stüdyolar
- **Listem:** kişisel arşiv ve hızlı ilerleme kontrolleri
- **Hesap:** Google girişi, senkronizasyon ve gizlilik tercihleri

Masaüstünde bu hedefler üst menüde; mobilde erişilebilir bir alt gezinme çubuğunda bulunur. Belirsiz `Harita` etiketi ana gezinmeden çıkarılır; tür ve stüdyo yolları Keşfet altında kalır.

## Ekran ilkeleri

### Ana sayfa

- İlk ekranda arama, tek güçlü seçki ve kişisel listeye dönüş bulunur.
- Marka anlatısı kısa tutulur.
- Katalog istatistikleri yardımcı bilgidir; ana eylem değildir.
- Sezon seçkileri yatay veya yoğun kart düzeniyle hızlı taranır.

### Keşfet

- Arama ilk görünümde ve belirgin olmalıdır.
- Filtreler aramanın hemen yanında veya altında bulunur.
- Kartlar okunabilir başlık, durum, puan ve tür bilgisi taşır.
- Tür ve stüdyo keşif yolları ikincil ama görünürdür.

### Anime detayı

- Başlık viewport'u ele geçirmez; uzun adlar kontrollü kırılır.
- Kişisel liste eylemi ana eylemdir.
- Temel bilgiler tek bakışta okunur.
- Editoryal içerik, stüdyo ve kaynaklar aşağıdaki içerik katmanında ilerler.

### Listem

- Kayıtlar istatistiklerden önce gelir.
- Filtreler kompakt ve yapışkan davranabilir.
- Bölüm artırma/azaltma ile durum değiştirme dokunmatik hedefleri en az 44 piksel olmalıdır.
- Boş durum doğrudan kataloğa yönlendirir.

## Kaçınılacaklar

- Viewport'un çoğunu kaplayan dekoratif başlıklar
- Mobilde kaybolan ana navigasyon
- Aynı ağırlıktaki çok sayıda CTA
- İnce, düşük kontrastlı ve küçük kontrol metinleri
- Anime içeriğini ikinci plana atan marka manifestoları
- Yalnız estetik gerekçeyle eklenen büyük boşluklar

Bu belge, arayüz revizyonlarında görsel ve davranışsal kararların kanonik kaynağıdır. Ürün aşamaları `ROADMAP.md`, hesap güvenliği ise `docs/ACCOUNT_ARCHITECTURE.md` tarafından yönetilmeye devam eder.
