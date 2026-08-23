-- Stage 21: let a connected Orbit agent manage the human's synced watch
-- journal without gaining a reusable credential or broad table authority.

grant select, update on public.watch_journal_entries to service_role;

create or replace function public.orbit_add_watch_journal_entry(
  p_user_id uuid,
  p_id text,
  p_anime_id text,
  p_episode_start integer,
  p_episode_end integer,
  p_watched_on date,
  p_note text,
  p_episode_total integer,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_progress integer;
  current_status text;
  next_progress integer;
  next_status text;
begin
  if char_length(p_id) not between 1 and 100
    or char_length(p_anime_id) not between 1 and 300
    or p_episode_start < 1
    or p_episode_end < p_episode_start
    or p_episode_end > 100000
    or (p_episode_total > 0 and p_episode_end > p_episode_total)
    or char_length(p_note) > 280 then
    raise exception 'invalid journal input';
  end if;

  insert into public.watch_journal_entries (
    user_id, id, anime_id, episode_start, episode_end, watched_on, note,
    client_created_at, client_updated_at, deleted_at
  ) values (
    p_user_id, p_id, p_anime_id, p_episode_start, p_episode_end, p_watched_on,
    p_note, p_now, p_now, null
  );

  select entry.progress, entry.status
  into current_progress, current_status
  from public.personal_list_entries as entry
  where entry.user_id = p_user_id and entry.anime_id = p_anime_id;

  if not found then
    next_progress := p_episode_end;
    next_status := case
      when p_episode_total > 0 and next_progress >= p_episode_total then 'COMPLETED'
      else 'WATCHING'
    end;
    insert into public.personal_list_entries (
      user_id, anime_id, status, progress, client_updated_at, deleted_at
    ) values (
      p_user_id, p_anime_id, next_status, next_progress, p_now, null
    );
  else
    next_progress := greatest(current_progress, p_episode_end);
    if p_episode_total > 0 then
      next_progress := least(next_progress, p_episode_total);
    end if;
    next_status := case
      when current_status = 'COMPLETED' then 'COMPLETED'
      when p_episode_total > 0 and next_progress >= p_episode_total then 'COMPLETED'
      else 'WATCHING'
    end;
    update public.personal_list_entries as entry
    set status = next_status,
        progress = next_progress,
        client_updated_at = p_now,
        deleted_at = null
    where entry.user_id = p_user_id and entry.anime_id = p_anime_id;
  end if;

  return jsonb_build_object('ilerleme', next_progress, 'durum', next_status);
end;
$$;

revoke all on function public.orbit_add_watch_journal_entry(uuid, text, text, integer, integer, date, text, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.orbit_add_watch_journal_entry(uuid, text, text, integer, integer, date, text, integer, timestamptz)
  to service_role;

comment on function public.orbit_add_watch_journal_entry(uuid, text, text, integer, integer, date, text, integer, timestamptz) is
  'Atomically adds an Orbit-authorized journal row and advances the same human list progress without moving it backwards.';
