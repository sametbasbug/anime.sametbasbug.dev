# Equinox Rota'ya katkı

Katkılar; ürün sınırına, veri lisanslarına ve Rota'nın görsel diline uyduğu sürece memnuniyetle değerlendirilir. Büyük bir değişikliğe başlamadan önce issue açarak yaklaşımı netleştirin.

## Yerel kurulum

Gereksinimler: Node.js 22.12 veya üzeri ve npm 10 veya üzeri.

```bash
git clone https://github.com/sametbasbug/anime.sametbasbug.dev.git
cd anime.sametbasbug.dev
npm ci
cp .env.example .env
npm run dev
```

Supabase değerleri olmadan uygulama güvenli local-first modda çalışır. Production kimlik bilgilerini veya service-role anahtarlarını hiçbir zaman commit etmeyin.

## Değişiklik akışı

1. Tek amacı olan küçük bir branch açın.
2. Mevcut TypeScript ve Astro biçimini koruyun.
3. `npm run check` çalıştırın; yapısal değişiklikte ayrıca `npm run build` alın.
4. Arayüz değişikliklerini masaüstü ve mobil viewport'ta doğrulayın.
5. Davranış veya ürün kararı değişiyorsa ilgili README/roadmap/belgeyi aynı PR'da güncelleyin.

CI her push ve pull request'te tam kontrol ile static build çalıştırır. Dependabot ve CodeQL sonuçları da merge öncesinde değerlendirilir.

## Ürün ve veri sınırları

- Video barındırma veya korsan yayın yönlendirmesi eklenmez.
- MAL ya da başka siteler scrape edilmez; harici API kullanımı izin ve koşul doğrulaması ister.
- Anime katalog verisinin ODbL/DbCL atfı korunur.
- Özgün editoryal metinler, Rota/Equinox markası ve görsel kimlik AGPL kapsamına girmez.
- Kullanıcı UUID'si, e-posta, senkronizasyon metadatası veya gizli anahtar kamusal yüzeye taşınmaz.

Lisans sınırlarının tamamı için [`CONTENT_LICENSE.md`](./CONTENT_LICENSE.md), ürün yönü için [`ROADMAP.md`](./ROADMAP.md), tasarım kararları için [`docs/DESIGN_DIRECTION.md`](./docs/DESIGN_DIRECTION.md) dosyasına bakın.

## Güvenlik

Bir güvenlik açığını public issue veya pull request ile paylaşmayın. [`SECURITY.md`](./SECURITY.md) içindeki özel bildirim yolunu kullanın.
