-- Rota stage 9: shareable, owner-controlled, read-only anime shelves.
--
-- The token is a capability URL secret. Public and unlisted profiles both use
-- it for now; PUBLIC means the owner permits future discovery, not that base
-- profile or list tables become directly readable.

alter table public.profiles
  add column if not exists share_token uuid not null default gen_random_uuid(),
  add column if not exists share_scores boolean not null default true,
  add column if not exists share_notes boolean not null default false;

create unique index if not exists profiles_share_token_idx
  on public.profiles (share_token);

-- Keep profile rows owner-only. In particular, adding a public view must not
-- turn the base table into a directory of UUIDs, e-mail-adjacent metadata or
-- sharing tokens.
revoke update on public.profiles from authenticated;
grant update (display_name, list_visibility, share_scores, share_notes)
  on public.profiles to authenticated;

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
    ), '[]'::jsonb)
  )
  from public.profiles as profile
  where profile.share_token = p_share_token
    and profile.list_visibility in ('UNLISTED', 'PUBLIC')
  limit 1;
$$;

create or replace function public.rotate_profile_share_token()
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  next_token uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.profiles
  set share_token = gen_random_uuid()
  where id = auth.uid()
  returning share_token into next_token;

  if next_token is null then
    raise exception 'Profile not found';
  end if;

  return next_token;
end;
$$;

revoke all on function public.get_shared_profile(uuid) from public;
revoke all on function public.rotate_profile_share_token() from public;
grant execute on function public.get_shared_profile(uuid) to anon, authenticated;
grant execute on function public.rotate_profile_share_token() to authenticated;

comment on column public.profiles.share_token is
  'High-entropy capability token for the read-only sharing RPC; rotate to invalidate old links.';
comment on column public.profiles.share_scores is
  'Owner choice controlling whether personal scores are included in the sanitized sharing RPC.';
comment on column public.profiles.share_notes is
  'Owner choice controlling whether personal notes are included in the sanitized sharing RPC.';
comment on function public.get_shared_profile(uuid) is
  'Returns only owner-approved display and active list fields; never user UUID, e-mail, tombstones or sync metadata.';
