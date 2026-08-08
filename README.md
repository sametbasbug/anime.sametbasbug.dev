# Rota

> Geçici ürün adı — anime yolculuğunun Türkçe kaydı.

Rota, Türkiye'deki anime izleyicileri için modern bir keşif, takip ve kişisel arşiv ürünüdür. Video barındırmaz ve korsan yayın bağlantısı sunmaz. İlk iki prototip; ürün dilini, görsel yönü ve gerçek katalog üzerinde arama ile detay deneyimini doğrulamak için hazırlanmıştır.

## Bugünkü durum

- Mobil öncelikli, responsive ana sayfa
- Gerçek katalogdan üretilen güncel ana sayfa seçkisi ve katalog haritası
- Duruma göre çalışan anime kartı filtreleri
- Proje içinde CSS ile üretilmiş özgün görsel kompozisyonlar
- 900 yapımlık gerçek, aranabilir katalog
- Başlık, alternatif ad, stüdyo, Türkçe tür etiketi ve yıla göre arama
- Tür ve yayın durumu filtreleri
- 20 Türkçe tür keşif sayfası ve normalize edilmiş stüdyo sayfaları
- Ortak tür, stüdyo, etiket, yıl ve formata göre üretilen benzer yapım önerileri
- Yayımlanmamış yapımları geriye alan, sonuç niteliği iyileştirilmiş arama sıralaması
- Statik üretilmiş 900 anime detay sayfası
- Dört durumlu, tarayıcıda yerel olarak saklanan kişisel anime listesi
- Bölüm ilerlemesi, 1–10 kişisel puan ve 600 karakterlik kişisel not
- Sayaçlar, durum filtreleri ve hızlı ilerleme kontrolleri içeren `/listem` ekranı
- Sekiz popüler yapım için özgün, spoiler kontrollü Türkçe editoryal profil
- Taslak, editoryal kontrol ve yayımlanmış durumlarını ayıran doğrulamalı içerik akışı
- İsteğe bağlı şifresiz hesap, profil ve liste görünürlüğü ekranı
- Yerel listeyi koruyan, tombstone destekli Supabase senkronizasyon katmanı
- Sahip kullanıcıyla sınırlı Postgres RLS migration'ı
- Astro static build

## Teknik temel

- Astro 7
- React 19
- TypeScript strict mode
- Supabase Auth + Postgres + RLS (hesap ve kullanıcı verisi)
- Sıfır UI framework bağımlılığı; görsel sistem proje içinde

```bash
npm install
npm run data:refresh
npm run content:check
npm run dev
npm run build
```

Yerel geliştirme adresi varsayılan olarak `http://localhost:4321` olur.

## Katalog verisi

Katalog, [manami-project/anime-offline-database](https://github.com/manami-project/anime-offline-database) sürümlerinden üretilir. Kaynak veritabanı **Open Database License (ODbL) v1.0**, içeriği **Database Contents License (DbCL) v1.0** kapsamındadır. Üretimde kullanılan sürüm ve atıf bilgisi hem katalog ekranında hem anime detaylarında görünür.

```bash
npm run data:refresh
```

Komut en güncel GitHub sürümünü indirir, beklenen lisansı doğrular ve `src/data/catalogue.json` dosyasını yeniden üretir. Arama verisi `/data/catalogue.json` üzerinden istemciye sunulur; detay sayfaları derleme sırasında statik oluşturulur.

AniList'in güncel kullanım koşulları, açık yetkilendirme ve sürdürülen eşzamanlama olmadan AniList ile rekabet eden liste/takip hizmetlerini API kullanımından men ediyor. Bu nedenle AniList doğrudan veri kaynağı değildir ve yazılı izin alınmadan eklenmemelidir. MAL veya başka siteler de scrape edilmez.

Harici poster URL'leri kaynakta bulunsa da kullanım hakları ayrıca netleştirilmeden gösterilmez; mevcut görseller proje içinde üretilen CSS kompozisyonlarıdır. Türkçe açıklamalar doğrudan kopyalanmaz, özgün editoryal metin olarak hazırlanacaktır. Ana sayfa seçkisi ve sayaçları derleme sırasında gerçek katalogdan üretilir.

## Kişisel liste ve hesap verisi

Kişisel liste local-first çalışır: her değişiklik önce sürümlü `rota.personal-list.v1` kaydıyla mevcut tarayıcıya yazılır. Depolama biçimi geriye uyumlu v2'ye yükseltilmiştir; silmeler çevrimdışı cihazlarda geri gelmesin diye tombstone olarak korunur.

İsteğe bağlı hesap açıldığında yalnız profil ve kişisel liste verisi Supabase'e eşitlenir. Katalog ile editoryal içerik statik ve sürüm kontrollü kalır. Temel tablolar RLS ile yalnız sahip kullanıcıya açıktır; `PUBLIC`/`UNLISTED` tercihi tek başına kişisel notlara dış erişim vermez.

Yerel yapılandırma için `.env.example` dosyasını `.env` olarak kopyala ve Supabase publishable değerlerini ekle. Migration ile güvenlik ayrıntıları [`docs/ACCOUNT_ARCHITECTURE.md`](./docs/ACCOUNT_ARCHITECTURE.md) içinde belgelenmiştir. Geliştirme projesi Supabase Free üzerinde kurulmuştur; ortam değerleri yoksa uygulama güvenli biçimde yerel modda kalır. Resend hesabı hazırdır, ancak özel SMTP alan adı ürün domain'i kesinleştiğinde bağlanacaktır.

## Editoryal içerik

Özgün Türkçe içerikler katalogdan ayrı olarak `src/data/editorial.json` içinde tutulur; böylece katalog yenilemeleri editoryal metinleri değiştirmez. Her kayıt `DRAFT`, `IN_REVIEW` veya `PUBLISHED` durumundadır. Ürün yalnızca yayımlanmış kayıtları gösterir; kontroldeki ve taslak metinler halka açık sayfalara aktarılmaz.

```bash
npm run content:check
```

Bu kontrol anime kimliklerini katalogla karşılaştırır; durum, alan uzunluğu, üç maddelik “neden izlenir?” bölümü ve yayımlanmış kayıtlardaki kontrol tarihini doğrular. `npm run check` ile üretim derlemesi bu adımı otomatik çalıştırır.

## Ürün sınırları

- Anime videosu barındırılmaz veya gömülmez.
- Korsan yayın yönlendirmesi yapılmaz.
- Kullanıcı yorumlarında spoiler ve korsan bağlantı moderasyonu ilk günden tasarlanır.
- Topluluğa bağımlı özelliklerden önce kişisel katalog ve takip değeri tamamlanır.

## Sıradaki kilometre taşları

Güncel devir özeti [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md), ayrıntılı ve kanonik ürün sırası [`ROADMAP.md`](./ROADMAP.md) dosyasında tutulur.

1. ~~Kataloğu ürünleştirme ve Türkçe sınıflandırma~~ — tamamlandı
2. ~~Kişisel liste MVP'si~~ — tamamlandı
3. ~~Türkçe editoryal içerik~~ — tamamlandı
4. **Hesap ve kalıcı veri** — Supabase üzerinde çalışıyor, fiziksel cihaz ve özel SMTP doğrulaması bekliyor
5. MAL/AniList içe aktarma fizibilitesi ve izinleri
6. Topluluk ve moderasyon
7. Marka ve yayın

## Sahiplik

Bu, Nyx'in bireysel Equinox projesidir. Ürün ve uygulama kararları Nyx ile Samet tarafından yürütülür.

## Lisans

Uygulama kaynak kodu **GNU AGPL v3.0 only** ile lisanslanır; ayrıntılar [`LICENSE`](./LICENSE) dosyasındadır. Özgün Türkçe editoryal içerikler, ürün metinleri, görsel kimlik ile Rota ve Equinox marka unsurları açık kaynak lisansına dahil değildir ve tüm hakları saklıdır. Katalog verisi kendi ODbL v1.0 ve DbCL v1.0 koşullarına tabidir.

Kapsam ayrımı ve üçüncü taraf materyalleri için [`CONTENT_LICENSE.md`](./CONTENT_LICENSE.md) dosyasına bakın.
