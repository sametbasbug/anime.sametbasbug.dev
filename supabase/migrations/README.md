# Migration geçmişi hakkında

## 2026-08-24 onarımı

Bu tarihte `supabase_migrations.schema_migrations` tablosu ile bu dizindeki
dosyalar tamamen ayrışmış durumdaydı: kesişim sıfırdı.

- **Yerel dosyalar** `YYYYMMDDNNNN` biçiminde (`202608070001`), 16 adet.
- **Uzak geçmiş** CLI'ın standart `YYYYMMDDHHMMSS` biçimindeydi, 8 adet.

Şema ise yerel dosyaların tamamını yansıtıyordu; canlı veritabanında her
migration'ın ürettiği tablo ve indeksler mevcuttu (`profiles_share_token_idx`,
`watch_journal_entries_user_watched_idx`, `orbit_action_log_pkey` …). Yani
migration'lar uygulanmıştı, yalnız defter tutulmamıştı.

`supabase db push` bu haliyle 16 migration'ın hepsini yeniden uygulamaya
kalkıyordu. `create policy` satırları idempotent olmadığı için ilk hatada
yarıda kalırdı.

Onarım `supabase migration repair` ile yapıldı. Bu komut YALNIZ geçmiş
tablosuna yazar; şemaya ve kullanıcı verisine dokunmaz.

### Silinen uzak kayıtlar

Aşağıdaki sekiz sürüm `--status reverted` ile geçmişten kaldırıldı. Karşılık
gelen dosya bu dizinde hiç bulunmuyordu; izleri kaybolmasın diye buraya
yazıldı:

```
20260812193420
20260812225049
20260813001600
20260813001655
20260816223545
20260817005611
20260817010208
20260817011015
```

Tarihleri 12–17 Ağustos 2026 aralığında. Aynı aralıktaki yerel dosyalar
(`202608120001`–`202608170004`) muhtemelen bunların yeniden adlandırılmış
hali; şema kanıtı ikisinin aynı işi yaptığını gösteriyor.

### Uygulanmış işaretlenenler

`202608070001`–`202608230004` arasındaki 15 dosya `--status applied` ile
işaretlendi. `202608240001` işaretlenmedi; o gerçekten uygulanmamıştı ve
normal `db push` ile gitti.

## Saklama süresi pg_cron olmadan işletiliyor

`202608240001` migration'ı `orbit_action_log_temizle()` fonksiyonunu kuruyor ve
pg_cron varsa günlük zamanlıyor. Bu projede **pg_cron kurulu değil** (panelde
doğrulandı: Integrations → Cron "Install integration" düğmesiyle duruyor,
`select count(*) from pg_extension where extname='pg_cron'` sıfır dönüyor).
Migration bu durumda düşmüyor, `RAISE WARNING` basıp geçiyor.

Zamanlamayı Edge Function üstlendi: `orbit-eylem` her başarılı ajan eyleminde
1/50 olasılıkla `orbit_action_log_temizle()` çağırıyor. Eklenti eklemeden,
yeni bir sır veya harici zamanlayıcı kurmadan saklama süresi işliyor.

pg_cron ileride kurulursa migration'daki `do $$` bloğu yeniden çalıştırılarak
zamanlama kurulabilir; o zaman Edge Function'daki çağrı kaldırılmalı.

## Bundan sonra

Yeni migration'ları CLI ile üret (`supabase migration new <ad>`) ki isim
biçimi geçmiş tablosuyla aynı kalsın. Elle adlandırma bu ayrışmayı yeniden
üretir.
