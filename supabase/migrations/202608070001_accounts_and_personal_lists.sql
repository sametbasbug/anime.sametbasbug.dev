-- Rota stage 4: optional accounts, private profiles and local-first list sync.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  list_visibility text not null default 'PRIVATE'
    check (list_visibility in ('PRIVATE', 'UNLISTED', 'PUBLIC')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(display_name) <= 50)
);

create table if not exists public.personal_list_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_id text not null,
  status text not null
    check (status in ('WATCHING', 'COMPLETED', 'PLANNED', 'DROPPED')),
  progress integer not null default 0 check (progress between 0 and 100000),
  score smallint check (score between 1 and 10),
  note text not null default '' check (char_length(note) <= 600),
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, anime_id),
  check (char_length(anime_id) between 1 and 300)
);

create index if not exists personal_list_entries_user_updated_idx
  on public.personal_list_entries (user_id, client_updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists personal_list_entries_set_updated_at on public.personal_list_entries;
create trigger personal_list_entries_set_updated_at
before update on public.personal_list_entries
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.personal_list_entries enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "personal_list_select_own" on public.personal_list_entries;
create policy "personal_list_select_own"
on public.personal_list_entries for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "personal_list_insert_own" on public.personal_list_entries;
create policy "personal_list_insert_own"
on public.personal_list_entries for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "personal_list_update_own" on public.personal_list_entries;
create policy "personal_list_update_own"
on public.personal_list_entries for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "personal_list_delete_own" on public.personal_list_entries;
create policy "personal_list_delete_own"
on public.personal_list_entries for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.profiles from anon;
revoke all on public.personal_list_entries from anon;
revoke all on public.profiles from authenticated;
revoke all on public.personal_list_entries from authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.personal_list_entries to authenticated;

comment on column public.personal_list_entries.deleted_at is
  'Soft-delete marker retained so removals propagate to devices that were offline.';
comment on column public.profiles.list_visibility is
  'Stored sharing preference. Base profile and list tables remain owner-only; future public views must expose sanitized columns.';
