-- Ajan eylemlerinde tekrar korumasını "önce yaz, sonra çalış"a çeviriyor ve
-- log'un süresiz büyümesini durduruyor.
--
-- Önceki tasarım şöyleydi: log OKUNUR, iş yapılır, log YAZILIR. Aradaki boşluk
-- gerçek bir açık: aynı `Idempotency-Key` ile eşzamanlı gelen iki istek de
-- "kayıt yok" görür ve ikisi de uygular. `rota.gunlugeEkle` için bu, insanın
-- günlüğünde çift satır demek. Ayrıca sondaki yazma başarısız olduğunda uç yine
-- `applied` dönüyordu; sonraki yeniden deneme işi ikinci kez yapıyordu.
--
-- Yeni tasarım: uç önce anahtarı REZERVE eder. Rezervasyon birincil anahtar
-- çakışmasıyla korunuyor; yarışı Postgres çözüyor, uygulama kodu değil.

-- Rezervasyonun ne zaman alındığı. `created_at` bu işe yaramıyor: onun anlamı
-- "kayıt ne zaman doğdu" ve saklama süresi ona bakıyor. Devralma ise ayrı bir
-- soru soruyor — "bu rezervasyonu tutan hâlâ çalışıyor mu?" — ve cevabı
-- değiştirilebilir bir alan gerektiriyor.
alter table public.orbit_action_log
  add column if not exists started_at timestamptz not null default now();

-- Çıktısı olmayan (yani henüz tamamlanmamış) rezervasyonlar aranıyor.
create index if not exists orbit_action_log_pending_idx
  on public.orbit_action_log (started_at)
  where output is null;

-- 30 gün saklama.
--
-- Bu sayı önceki migration'ın yorumunda söz verilmişti ama uygulayan hiçbir şey
-- yoktu; tablo süresiz büyüyordu. Yorumun anlattığı şeyi kod yapmıyorsa yorum
-- değil temenni olur.
--
-- Gerekçe değişmedi: yeniden denemeler dakikalar içinde olur, aylar sonra gelen
-- aynı anahtar zaten yeni bir istektir.
create or replace function public.orbit_action_log_temizle()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  silinen integer;
begin
  delete from public.orbit_action_log
   where created_at < now() - interval '30 days';
  get diagnostics silinen = row_count;
  return silinen;
end;
$$;

revoke all on function public.orbit_action_log_temizle() from public;
revoke all on function public.orbit_action_log_temizle() from anon;
revoke all on function public.orbit_action_log_temizle() from authenticated;
grant execute on function public.orbit_action_log_temizle() to service_role;

-- Zamanlama pg_cron varsa kurulur. Yoksa migration DÜŞMEZ ama sessiz de
-- kalmaz: temizlik fonksiyonu her hâlükârda var ve dışarıdan çağrılabilir.
-- Sessizce geçmek, "saklama var" sanılan ama olmayan bir duruma geri dönmek
-- olurdu.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('orbit-action-log-temizlik')
      where exists (select 1 from cron.job where jobname = 'orbit-action-log-temizlik');
    perform cron.schedule(
      'orbit-action-log-temizlik',
      '17 4 * * *',
      $cron$select public.orbit_action_log_temizle();$cron$
    );
    raise notice 'orbit_action_log temizliği pg_cron ile günlük zamanlandı.';
  else
    raise warning 'pg_cron kurulu değil: orbit_action_log_temizle() zamanlanmadı, elle veya harici bir zamanlayıcıyla çağrılmalı.';
  end if;
end;
$$;

comment on column public.orbit_action_log.started_at is
  'Rezervasyonun alındığı an; terk edilmiş rezervasyonun devralınabilmesi için güncellenir.';
comment on function public.orbit_action_log_temizle() is
  '30 günden eski ajan eylem kayıtlarını siler ve silinen satır sayısını döndürür.';
