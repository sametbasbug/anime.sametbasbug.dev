# Equinox Rota

> Rota by Equinox — anime yolculuğunun Türkçe kaydı.

Equinox Rota, Türkiye'deki anime izleyicileri için modern bir keşif, takip ve kişisel arşiv ürünüdür. Video barındırmaz ve korsan yayın bağlantısı sunmaz. İlk iki prototip; ürün dilini, görsel yönü ve gerçek katalog üzerinde arama ile detay deneyimini doğrulamak için hazırlanmıştır.

Canlı soft alpha: **[anime.sametbasbug.dev](https://anime.sametbasbug.dev/)**

## Bugünkü durum

- Mobil öncelikli, responsive ana sayfa
- Açık ve kawaii **Soft Celestial Otaku** tasarım sistemi; manga editoryali, masaüstü üst menüsü ve mobil alt gezinme
- Ana sayfada doğrudan katalog araması ve yerel kişisel arşiv özeti
- Gerçek katalogdan üretilen güncel sezon rafı, haftalık dönüşümlü editoryal seçki ve katalog haritası
- Duruma göre çalışan anime kartı filtreleri
- Proje içinde CSS ile üretilmiş özgün görsel kompozisyonlar
- 900 yapımlık gerçek, aranabilir katalog
- Başlık, alternatif ad, stüdyo, Türkçe tür etiketi ve yıla göre arama
- Türkçe tür, format, yayın durumu ve sıralama filtreleri
- 20 Türkçe tür keşif sayfası ve normalize edilmiş stüdyo sayfaları
- Ortak tür, stüdyo, etiket, yıl ve formata göre üretilen benzer yapım önerileri
- Yayımlanmamış yapımları geriye alan, sonuç niteliği iyileştirilmiş arama sıralaması
- Statik üretilmiş 900 anime detay sayfası
- Dört durumlu, tarayıcıda yerel olarak saklanan kişisel anime listesi
- Bölüm ilerlemesi, 1–10 kişisel puan ve 600 karakterlik kişisel not
- Durumlara ayrılan koleksiyon rafları, sayaçlar, filtreler ve hızlı ilerleme kontrolleri içeren `/listem` ekranı
- Manga açılımı ritmine sahip anime detayları ve otaku köşesi olarak tasarlanan hesap ekranı
- Boş, yükleme, hata, senkronizasyon ve kutlama hâlleriyle yaşayan marka yüzü ve göksel yoldaş **Rota**
- Mevsimsel renk katmanı, erişilebilir mikro animasyonlar ve karakterli sayfa geçişleri
- Rota'nın ortak yüz anatomisini kullanan site ikonu, favicon ve 1200×630 Open Graph/Twitter paylaşım kartı
- 20 güçlü yapım için özgün, spoiler kontrollü Türkçe editoryal profil
- Taslak, editoryal kontrol ve yayımlanmış durumlarını ayıran doğrulamalı içerik akışı
- İsteğe bağlı **Equinox Orbit** girişi (Supabase'de `custom:orbit` OIDC sağlayıcısı); profil ve liste görünürlüğü ekranı
- Yerel listeyi koruyan, tombstone destekli Supabase senkronizasyon katmanı
- Sahip kullanıcıyla sınırlı Postgres RLS migration'ı
- Anime başına tek topluluk incelemesi, spoiler perdesi, özel rapor kuyruğu ve rol korumalı moderasyon arayüzü
- E-posta, kullanıcı UUID'si ve senkronizasyon metadatasını açmayan dar RPC üzerinden salt okunur Rota paylaşım bağlantıları
- Astro static build

## Teknik temel

- Astro 7
- React 19
- TypeScript strict mode
- Supabase Auth + Postgres + RLS (hesap ve kullanıcı verisi)
- Sıfır UI framework bağımlılığı; görsel sistem proje içinde

Onaylanan ürün deneyimi ve görsel sistem ilkeleri [`docs/DESIGN_DIRECTION.md`](./docs/DESIGN_DIRECTION.md) içinde kanonik olarak tutulur.

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

Komut en güncel GitHub sürümünü indirir, beklenen lisansı doğrular ve `src/data/catalogue.json` dosyasını yeniden üretir. Üretim sırasında aynı başlık/yıl/formatta kalan kesin upstream kopyalar tek kanonik kayıtta birleştirilir; seçkiye giren açık devam sezonlarının kaynakta bulunan önceki sezonları da 900 kayıt sınırı içinde korunur. Arama verisi `/data/catalogue.json` üzerinden istemciye sunulur; detay sayfaları derleme sırasında statik oluşturulur.

AniList'in güncel kullanım koşulları, açık yetkilendirme ve sürdürülen eşzamanlama olmadan AniList ile rekabet eden liste/takip hizmetlerini API kullanımından men ediyor. Bu nedenle AniList doğrudan veri kaynağı değildir ve yazılı izin alınmadan eklenmemelidir. MAL veya başka siteler de scrape edilmez.

Posterler TMDB'nin resmî API/CDN hizmetinden gösterilir. Bilinen TMDB/anime model uyuşmazlıkları önce doğrulanmış `src/data/tmdb-poster-overrides.json` kayıtlarıyla çözülür; açık numaralı TV sezonları normal aramadan önce ana seri üzerinden eşleştirilir ve mevcutsa sezona özgü görsel tercih edilir. Kalan yapımlar bilinen İngilizce/Japonca adlar genelinde sıkı başlık-yıl-tür eşleşmesiyle çözülür; güvenli eşleşme kurulamayanlar proje içinde üretilen Rota CSS kompozisyonlarını korur. Zorunlu TMDB atfı globaldir ve anime-offline-database içindeki üçüncü taraf poster URL'leri kullanılmaz. Türkçe açıklamalar doğrudan kopyalanmaz, özgün editoryal metin olarak hazırlanacaktır. Ana sayfa seçkisi ve sayaçları derleme sırasında gerçek katalogdan üretilir.

## Kişisel liste ve hesap verisi

Kişisel liste local-first çalışır: her değişiklik önce sürümlü `rota.personal-list.v1` kaydıyla mevcut tarayıcıya yazılır. Depolama biçimi geriye uyumlu v2'ye yükseltilmiştir; silmeler çevrimdışı cihazlarda geri gelmesin diye tombstone olarak korunur.

İsteğe bağlı hesap açıldığında yalnız profil ve kişisel liste verisi Supabase'e eşitlenir. Katalog ile editoryal içerik statik ve sürüm kontrollü kalır. Temel tablolar RLS ile yalnız sahip kullanıcıya açıktır. `PUBLIC`/`UNLISTED` paylaşımı temel tablo erişimi açmaz; yüksek entropili bağlantı koduyla çalışan dar RPC yalnız görünen ad, aktif liste durumu ve bölüm ilerlemesini verir. Puan ile kişisel not ayrı tercihlerdir; e-posta, kullanıcı UUID'si, tombstone ve senkronizasyon zamanları paylaşılmaz. Bağlantı kapatılabilir veya kodu yenilenerek eskisi geçersiz kılınabilir.

Yerel yapılandırma için `.env.example` dosyasını `.env` olarak kopyala ve
Supabase publishable değerlerini ekle. Giriş için siteye ait ayrı bir istemci
kimliği **gerekmiyor**: kimlik Orbit'ten geliyor ve Orbit'in istemci bilgileri
Supabase sağlayıcı ayarında duruyor. Bu yüzden `PUBLIC_GOOGLE_CLIENT_ID`
kaldırıldı; artık hiçbir kod onu okumuyor.

Migration ile güvenlik ayrıntıları
[`docs/ACCOUNT_ARCHITECTURE.md`](./docs/ACCOUNT_ARCHITECTURE.md) içinde
belgelenmiştir — Orbit sağlayıcısının tam yapılandırması, kapsamları ve izni
geri almanın sınırı da orada. Geliştirme projesi Supabase Free üzerinde
kurulmuştur; ortam değerleri yoksa uygulama güvenli biçimde yerel modda kalır.

Kimlik doğrulama tek yoldan yapılır: kullanıcı Orbit'e yönlenir, orada onay
verir ve `/hesap` adresine döner (PKCE, `?code=`). Google girişi, e-posta
bağlantısı, özel SMTP ve CAPTCHA bağımlılıkları kaldırılmıştır. Yerel
geliştirmede dönüş adresi Supabase'in izinli listesinde **4321** portuyla kayıtlı;
`npm run dev` başka bir portta koşarsa giriş Orbit'e gider ama geri dönmez.
Hesapsız local-first kullanım aynen korunur.

## Editoryal içerik

Özgün Türkçe içerikler katalogdan ayrı olarak `src/data/editorial.json` içinde tutulur; böylece katalog yenilemeleri editoryal metinleri değiştirmez. Her kayıt `DRAFT`, `IN_REVIEW` veya `PUBLISHED` durumundadır. Ürün yalnızca yayımlanmış kayıtları gösterir; kontroldeki ve taslak metinler halka açık sayfalara aktarılmaz.

```bash
npm run content:check
```

Bu kontrol anime kimliklerini katalogla karşılaştırır; durum, alan uzunluğu, üç maddelik “neden izlenir?” bölümü, spoiler onayı, yinelenen uzun cümleler ve yayımlanmış kayıtlardaki kontrol tarihini doğrular. Haftalık ana sayfa seçkilerinin yalnız yayımlanmış profillerden oluşmasını, tekrar etmemesini ve 20–30 profil hedefini de korur. `npm run check` ile üretim derlemesi bu adımı otomatik çalıştırır.

`npm run auth:check` (yine `npm run check` içinde) Orbit girişinin **dışarıyla
eşleşmesi gereken** kısımlarını korur: sağlayıcı adının birebir `custom:orbit`
olması, dönüş yolunun `/hesap` kalması, akışın `pkce` ve `detectSessionInUrl`'in
açık olması, Google giriş çağrısının geri sızmaması ve düğme metninin CSS ile
büyütülmemesi. Bunların hiçbiri derlemeyi kırmaz ama her biri girişi sessizce
öldürür — karşılıkları Supabase'in sağlayıcı ayarında ve izinli dönüş adresleri
listesinde duruyor.

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
4. ~~Hesap ve kalıcı veri~~ — Orbit girişi, Supabase senkronizasyonu ve iki cihazlı kabul doğrulamasıyla tamamlandı
5. MAL/AniList içe aktarma fizibilitesi ve izinleri — yazılı API başvurusunun yanıtı bekleniyor
6. ~~Topluluk ve moderasyon~~ — production kabulüyle tamamlandı
7. ~~Marka ve yayın~~ — **Equinox Rota** adıyla tamamlandı
8. ~~Ürün deneyimi ve görsel sistem~~ — **Soft Celestial Otaku** yönüyle tamamlandı
9. ~~Paylaşılabilir Rota profili~~ — production migration ve gerçek hesap kabulüyle tamamlandı
10. ~~Kişisel istatistikler~~ — production migration ve gerçek hesap kabulüyle tamamlandı
11. ~~Yedekleme ve taşınabilirlik~~ — sürümlü JSON/CSV, doğrulamalı geri yükleme ve canlı kabulüyle tamamlandı
12. Editoryal genişleme — 20 özgün profil ve beş haftalık seçki yerelde hazır; canlı kabul bekliyor

## Sahiplik

Bu, Nyx'in bireysel Equinox projesidir. Ürün ve uygulama kararları Nyx ile Samet tarafından yürütülür.

## Lisans

Uygulama kaynak kodu **GNU AGPL v3.0 only** ile lisanslanır; ayrıntılar [`LICENSE`](./LICENSE) dosyasındadır. Özgün Türkçe editoryal içerikler, ürün metinleri, görsel kimlik ile Rota ve Equinox marka unsurları açık kaynak lisansına dahil değildir ve tüm hakları saklıdır. Katalog verisi kendi ODbL v1.0 ve DbCL v1.0 koşullarına tabidir.

Kapsam ayrımı ve üçüncü taraf materyalleri için [`CONTENT_LICENSE.md`](./CONTENT_LICENSE.md) dosyasına bakın.
