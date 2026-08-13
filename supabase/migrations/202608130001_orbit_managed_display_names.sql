-- Rota display names are managed by Equinox Orbit, not edited inside Rota.
-- Keep a local snapshot because public review/profile RPCs must not query the
-- external identity provider. Supabase refreshes raw_user_meta_data after an
-- Orbit OIDC sign-in; this trigger copies only the public display-name claim.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  orbit_name text;
begin
  orbit_name := left(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'preferred_username'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    ''
  ), 50);

  insert into public.profiles (id, display_name)
  values (new.id, orbit_name)
  on conflict (id) do update
    set display_name = excluded.display_name
    where public.profiles.display_name is distinct from excluded.display_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_changed on auth.users;
create trigger on_auth_user_profile_changed
after update of raw_user_meta_data on auth.users
for each row
when (old.raw_user_meta_data is distinct from new.raw_user_meta_data)
execute function public.handle_new_user();

-- Existing Orbit-linked accounts get the same snapshot immediately when the
-- migration is applied; the next OIDC sign-in keeps it current thereafter.
update public.profiles as profile
set display_name = left(coalesce(
  nullif(btrim(auth_user.raw_user_meta_data ->> 'name'), ''),
  nullif(btrim(auth_user.raw_user_meta_data ->> 'preferred_username'), ''),
  nullif(btrim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
  ''
), 50)
from auth.users as auth_user
where profile.id = auth_user.id
  and profile.display_name is distinct from left(coalesce(
    nullif(btrim(auth_user.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(auth_user.raw_user_meta_data ->> 'preferred_username'), ''),
    nullif(btrim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
    ''
  ), 50);

-- The browser may still update sharing preferences, but it can no longer
-- bypass Orbit and invent a second display name through the Data API.
revoke update (display_name) on public.profiles from authenticated;

comment on column public.profiles.display_name is
  'Orbit-managed display-name snapshot refreshed from OIDC user metadata; not user-editable through Rota.';
comment on function public.handle_new_user() is
  'Creates the Rota profile and refreshes its Orbit-managed display-name snapshot after OIDC metadata changes.';
