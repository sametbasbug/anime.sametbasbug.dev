-- Rota stage 16: owner-only collections, local-first sync and opt-in sharing.

create or replace function public.valid_collection_anime_ids(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(value) <> 'array' then false
    else jsonb_array_length(value) <= 200
      and not exists (
        select 1
        from jsonb_array_elements(value) as item
        where jsonb_typeof(item) <> 'string'
          or char_length(item #>> '{}') not between 1 and 300
      )
      and (
        select count(*) = count(distinct item #>> '{}')
        from jsonb_array_elements(value) as item
      )
  end;
$$;

create table if not exists public.personal_collections (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  description text not null default '',
  color text not null default 'lavender',
  anime_ids jsonb not null default '[]'::jsonb,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (char_length(id) between 1 and 100),
  check (char_length(btrim(name)) between 1 and 60),
  check (char_length(description) <= 240),
  check (color in ('lavender', 'coral', 'mint', 'sun', 'sky')),
  check (public.valid_collection_anime_ids(anime_ids))
);

create index if not exists personal_collections_user_updated_idx
  on public.personal_collections (user_id, client_updated_at desc);

drop trigger if exists personal_collections_set_updated_at on public.personal_collections;
create trigger personal_collections_set_updated_at
before update on public.personal_collections
for each row execute function public.set_updated_at();

create or replace function public.keep_newer_personal_collection_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.client_updated_at < old.client_updated_at then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists personal_collections_keep_newer_version on public.personal_collections;
create trigger personal_collections_keep_newer_version
before update on public.personal_collections
for each row execute function public.keep_newer_personal_collection_version();

alter table public.personal_collections enable row level security;

drop policy if exists "personal_collections_select_own" on public.personal_collections;
create policy "personal_collections_select_own" on public.personal_collections
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "personal_collections_insert_own" on public.personal_collections;
create policy "personal_collections_insert_own" on public.personal_collections
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "personal_collections_update_own" on public.personal_collections;
create policy "personal_collections_update_own" on public.personal_collections
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "personal_collections_delete_own" on public.personal_collections;
create policy "personal_collections_delete_own" on public.personal_collections
for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.personal_collections from anon;
revoke all on public.personal_collections from authenticated;
grant select, insert, update, delete on public.personal_collections to authenticated;

revoke all on function public.valid_collection_anime_ids(jsonb) from public, anon, authenticated;
grant execute on function public.valid_collection_anime_ids(jsonb) to authenticated;
revoke all on function public.keep_newer_personal_collection_version() from public, anon, authenticated;

alter table public.profiles
  add column if not exists share_collections boolean not null default false;

grant update (share_collections) on public.profiles to authenticated;

create or replace function public.get_shared_profile(p_share_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'display_name', coalesce(nullif(btrim(profile.display_name), ''), 'Anime yolcusu'),
    'list_visibility', profile.list_visibility,
    'share_scores', profile.share_scores,
    'share_notes', profile.share_notes,
    'share_statistics', profile.share_statistics,
    'share_collections', profile.share_collections,
    'entries', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'anime_id', entry.anime_id,
          'status', entry.status,
          'progress', entry.progress,
          'score', case when profile.share_scores then entry.score else null end,
          'note', case when profile.share_notes then entry.note else null end
        )
        order by entry.client_updated_at desc
      )
      from public.personal_list_entries as entry
      where entry.user_id = profile.id
        and entry.deleted_at is null
    ), '[]'::jsonb),
    'collections', case when profile.share_collections then coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', collection.id,
          'name', collection.name,
          'description', collection.description,
          'color', collection.color,
          'anime_ids', collection.anime_ids
        )
        order by collection.client_updated_at desc
      )
      from public.personal_collections as collection
      where collection.user_id = profile.id
        and collection.deleted_at is null
    ), '[]'::jsonb) else '[]'::jsonb end
  )
  from public.profiles as profile
  where profile.share_token = p_share_token
    and profile.list_visibility in ('UNLISTED', 'PUBLIC')
  limit 1;
$$;

revoke all on function public.get_shared_profile(uuid) from public;
grant execute on function public.get_shared_profile(uuid) to anon, authenticated;

comment on table public.personal_collections is
  'Owner-only local-first anime collections. Tombstones prevent offline deletions from returning.';
comment on column public.profiles.share_collections is
  'Owner choice controlling whether active custom collections appear in the read-only shared profile.';
comment on function public.get_shared_profile(uuid) is
  'Returns only owner-approved display, active list and optional collection fields; never user UUID, e-mail, tombstones or sync metadata.';
