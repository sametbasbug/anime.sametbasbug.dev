# Equinox Rota topluluk ve moderasyon modeli

Bu belge 6. aşamanın ürün, güvenlik ve uygulama sınırlarını tanımlar. Amaç, Rota'nın kişisel keşif değerini bozmadan anime başlıklarına nitelikli kullanıcı değerlendirmeleri eklemektir. Genel amaçlı sosyal akış bu aşamanın ilk teslimi değildir.

## İlk teslim

- Her kullanıcı bir anime için tek inceleme yayımlayabilir; sonradan düzenleyebilir veya silebilir.
- İnceleme 20–2.000 karakterdir. Puan isteğe bağlıdır ve 1–10 arasındadır.
- İncelemelerde bağlantı kabul edilmez. Böylece korsan yönlendirme, reklam ve bağlantı spam'i daha veritabanına yazılmadan durdurulur.
- Spoiler içeren inceleme yazar tarafından işaretlenir ve okuyucunun açık eylemine kadar kapalı gösterilir.
- Giriş yapmış kullanıcılar işaretlenmemiş spoiler, taciz/nefret, korsan yönlendirme, spam veya başka ihlalleri raporlayabilir.
- Kullanıcı kendi incelemesini raporlayamaz ve aynı incelemeyi ikinci kez raporlayamaz.
- Rapor sayısı içeriği otomatik gizlemez. Gizleme, kaldırma veya ihlal yok kararı yalnız yetkili moderatör tarafından verilir.

## Topluluk kuralları

1. Yapımı ve kendi izleme deneyimini tartış; başka kullanıcıya saldırma.
2. Spoiler'ı doğru işaretle. İşaretlenmemiş önemli olay ve final bilgileri gizlenebilir.
3. Korsan yayın adresi, indirme bağlantısı, reklam veya yönlendirme paylaşma.
4. Taciz, tehdit, nefret söylemi, hedef gösterme ve kişisel bilgi yayımlama yasaktır.
5. Tekrarlanan, ilgisiz, yanıltıcı veya otomatik üretilmiş spam içerik yayımlama.
6. Eleştiri serbesttir; puan veya görüş ayrılığı tek başına moderasyon nedeni değildir.

## Yaptırım modeli

- `PUBLISHED`: İnceleme yayındadır.
- `HIDDEN`: İnceleme değerlendirme veya düzeltme gerektirdiği için kamudan geçici olarak gizlidir.
- `REMOVED`: Açık kural ihlali nedeniyle kamudan kaldırılmıştır.
- Moderasyon uygulanmış inceleme kullanıcı tarafından yeniden yayımlanamaz, düzenlenemez veya ürün içinden silinip yeniden oluşturularak karar aşılamaz. Veri silme talebi destek adresinden yürütülür.
- Moderatör notu yalnız inceleme sahibine gösterilir; rapor ayrıntıları ve raporlayan kimliği kamusal değildir.
- İtiraz ve veri talepleri `nyxyapayzeka@gmail.com` adresinden alınır.

## Teknik güven sınırı

- `community_reviews` ve `community_review_reports` tablolarına `anon` veya `authenticated` rolüyle doğrudan erişim verilmez.
- Kamusal okuma, yalnız yayımdaki incelemenin gerekli alanlarını döndüren `get_anime_reviews` RPC'sinden geçer. Kullanıcı UUID'si ve moderasyon notu açığa çıkmaz.
- Yazma, silme ve raporlama dar `security definer` RPC'leriyle doğrulanır; istemci kontrolleri güvenlik sınırı sayılmaz.
- Yeni incelemeler kullanıcı başına saatte 5, raporlar saatte 10 ile sınırlıdır.
- Moderasyon yetkisi kullanıcı tarafından değiştirilemeyen Supabase `app_metadata.rota_role` alanından doğrulanır. Geçerli roller `owner` ve `moderator`dır.
- İnceleme gövdesi düz metin olarak gösterilir; HTML çalıştırılmaz.

## Sonraki dilimler

- Üretim migration'ını uygulamak ve ürün sahibine `owner` rolü vermek.
- İki ayrı hesapla yazma, spoiler, raporlama ve moderasyon kararını uçtan uca doğrulamak.
- Gerçek kullanım oluşursa itiraz geçmişi, kullanıcı engelleme ve kademeli yazma kısıtlarını değerlendirmek.
- Genel sosyal akışı yalnız anime başlığına bağlı incelemeler nitelikli ve yönetilebilir kaldıktan sonra yeniden değerlendirmek.
