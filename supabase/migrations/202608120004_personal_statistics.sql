-- Rota stage 10: owner statistics and an explicit sharing preference.

alter table public.profiles
  add column if not exists share_statistics boolean not null default false;

grant update (share_statistics) on public.profiles to authenticated;

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

comment on column public.profiles.share_statistics is
  'Owner choice controlling whether derived watch-time, completion, genre and studio statistics are shown on the shared profile.';
