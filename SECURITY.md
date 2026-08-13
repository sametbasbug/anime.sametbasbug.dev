# Güvenlik politikası

## Desteklenen sürüm

Equinox Rota sürekli dağıtılır; yalnız `main` dalındaki güncel production sürümü güvenlik düzeltmeleri alır.

## Açık bildirme

Hassas bir güvenlik açığını issue, discussion veya herkese açık pull request olarak yayımlamayın. GitHub üzerindeki **[özel güvenlik bildirimi](https://github.com/sametbasbug/anime.sametbasbug.dev/security/advisories/new)** kanalını kullanın.

Bildirimde mümkünse şunları ekleyin:

- Etkilenen sayfa veya bileşen
- Tekrarlama adımları
- Beklenen etki ve saldırı önkoşulları
- Kanıt niteliğinde, kişisel veri içermeyen örnek

Gerçek kullanıcı verisine erişmeyin, veriyi değiştirmeyin ve hizmeti kesintiye uğratacak testler yapmayın. Bildirim alındığında kapsam doğrulanır, gerekli düzeltme hazırlanır ve yayımlama zamanı bildirimi yapan kişiyle koordine edilir.

## Otomatik kontroller

Bağımlılıklar Dependabot ve `npm audit`; JavaScript/TypeScript kaynakları CodeQL; her değişiklik ise tam proje kontrolü ve static build ile izlenir. Bunlar sorumlu bildirim kanalının yerini tutmaz.
