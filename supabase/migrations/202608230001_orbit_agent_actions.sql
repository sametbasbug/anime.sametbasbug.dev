-- Orbit'ten gelen ajan eylemleri.
--
-- Ajan, insanın Orbit hesabıyla bağladığı Rota kaydında insanın ADINA iş
-- yapıyor. Ayrı ajan hesabı ya da ayrı ajan listesi yok: yazılan satırlar
-- insanın kendi satırları ve RLS altında hiçbir şey değişmiyor.
--
-- Buraya gelen istek tarayıcıdan gelmiyor, Orbit'ten geliyor ve Orbit'in
-- imzalı belgesini taşıyor. Belgeyi Edge Function doğruluyor; bu dosya iki
-- şeyi kuruyor: Orbit kimliğini Supabase kullanıcısına çeviren yol ve aynı
-- işin iki kez yapılmasını engelleyen kayıt.

-- 1. Orbit kimliği → Supabase kullanıcısı
--
-- Orbit'in `sub`'ı pairwise: her siteye aynı insan için FARKLI bir kimlik
-- veriyor. Rota'nın gördüğü kimlik, insan Orbit ile giriş yaptığında
-- `auth.identities.provider_id` olarak zaten kaydedilmiş olan kimlikle aynı.
-- Yani yeni bir eşleme tablosu kurmuyoruz; var olanı okuyoruz.
--
-- SECURITY DEFINER, çünkü `auth.identities` normal rollere kapalı. `anon` ve
-- `authenticated` bu fonksiyonu ÇAĞIRAMAZ: çağırabilseydi, elinde bir Orbit
-- subject'i olan herkes o kimliğin hangi kullanıcıya ait olduğunu sorabilirdi.
create or replace function public.orbit_subject_user(p_subject text)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select identity.user_id
    from auth.identities as identity
   where identity.provider = 'custom:orbit'
     and identity.provider_id = p_subject
   limit 1;
$$;

revoke all on function public.orbit_subject_user(text) from public;
revoke all on function public.orbit_subject_user(text) from anon;
revoke all on function public.orbit_subject_user(text) from authenticated;
grant execute on function public.orbit_subject_user(text) to service_role;

-- 2. Tekrar koruması
--
-- Ajan tarafı yeniden denemeye yatkın: bir zaman aşımı, bir yeniden bağlanma
-- ve aynı istek ikinci kez gelir. Anahtarsız bir tekrar, listeye ikinci kez
-- yazmak demek. Orbit `Idempotency-Key`'i taşıyor, burası onu tutuyor.
--
-- Cevap da saklanıyor: tekrar gelen istek "zaten yapıldı" demekle kalmıyor,
-- İLK ÇALIŞMANIN cevabını döndürüyor. Yalnız "yapıldı" demek, ajanın sonucu
-- hiç göremeden devam etmesi olurdu.
create table if not exists public.orbit_action_log (
  idempotency_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id text not null,
  -- Girdinin özeti: aynı anahtar farklı bir gövdeyle gelirse bu bir tekrar
  -- değil, çakışmadır ve sessizce ilk cevabı döndürmek yanlış olur.
  input_digest text not null,
  output jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, idempotency_key),
  check (char_length(idempotency_key) between 1 and 128),
  check (char_length(operation_id) between 3 and 80)
);

-- Kayıt yalnız Edge Function'ın (service_role) işi. Tarayıcıya açmıyoruz:
-- bu tablo "ajan ne yaptı" sorusunun cevabı ve kullanıcının kendi listesinden
-- okunabilecek bir şey değil.
alter table public.orbit_action_log enable row level security;

-- Eski kayıtlar birikmesin. 30 gün, çünkü tekrar denemeler dakikalar içinde
-- olur; aylar sonra gelen aynı anahtar zaten yeni bir istektir.
create index if not exists orbit_action_log_created_idx
  on public.orbit_action_log (created_at);
