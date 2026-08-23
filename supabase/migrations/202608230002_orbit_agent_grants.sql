-- Ajan ucunun tablolara erişimi.
--
-- `service_role` RLS'i atlar ama TABLO YETKİSİ ayrıca gerekir; ikisi farklı
-- şeyler ve karıştırmak sessiz bir 403 üretiyor. Canlıda tam olarak bu oldu:
-- imza doğrulandı, kullanıcı bulundu, sonra PostgREST
-- "permission denied for table personal_list_entries" dedi ve ajan yalnız
-- "site 400 döndü" gördü.
--
-- Yetkiler dar tutuluyor: ucun yaptığı iş kadar.
--   personal_list_entries → okuma, ekleme, güncelleme (upsert)
--   orbit_action_log      → okuma (tekrar kontrolü), ekleme (kayıt)
-- DELETE hiçbirinde yok: ajan insanın kaydını silmiyor. Silmesi gerekirse o
-- ayrı bir işlem ve ayrı bir karardır.
grant select, insert, update on public.personal_list_entries to service_role;
grant select, insert on public.orbit_action_log to service_role;

-- `anon` ve `authenticated` bu kayda erişemez. Tablo "ajan ne yaptı"nın
-- kaydı; tarayıcıdan okunacak bir şey değil ve RLS politikası da yok, yani
-- yetki verilseydi bile boş dönerdi — ama yetkiyi hiç vermemek daha açık.
revoke all on public.orbit_action_log from anon, authenticated;
