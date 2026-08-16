-- Rota stage 13: owner-only, local-first episode journal.

create table if not exists public.watch_journal_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  anime_id text not null,
  episode_start integer not null check (episode_start between 1 and 100000),
  episode_end integer not null check (episode_end between episode_start and 100000),
  watched_on date not null,
  note text not null default '' check (char_length(note) <= 280),
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (char_length(id) between 1 and 100),
  check (char_length(anime_id) between 1 and 300)
);

create index if not exists watch_journal_entries_user_watched_idx
  on public.watch_journal_entries (user_id, watched_on desc);

drop trigger if exists watch_journal_entries_set_updated_at on public.watch_journal_entries;
create trigger watch_journal_entries_set_updated_at
before update on public.watch_journal_entries
for each row execute function public.set_updated_at();

create or replace function public.keep_newer_watch_journal_version()
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

drop trigger if exists watch_journal_entries_keep_newer_version on public.watch_journal_entries;
create trigger watch_journal_entries_keep_newer_version
before update on public.watch_journal_entries
for each row execute function public.keep_newer_watch_journal_version();

alter table public.watch_journal_entries enable row level security;

drop policy if exists "watch_journal_select_own" on public.watch_journal_entries;
create policy "watch_journal_select_own" on public.watch_journal_entries
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "watch_journal_insert_own" on public.watch_journal_entries;
create policy "watch_journal_insert_own" on public.watch_journal_entries
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "watch_journal_update_own" on public.watch_journal_entries;
create policy "watch_journal_update_own" on public.watch_journal_entries
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "watch_journal_delete_own" on public.watch_journal_entries;
create policy "watch_journal_delete_own" on public.watch_journal_entries
for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.watch_journal_entries from anon;
revoke all on public.watch_journal_entries from authenticated;
grant select, insert, update, delete on public.watch_journal_entries to authenticated;

revoke all on function public.keep_newer_watch_journal_version() from public, anon, authenticated;

comment on table public.watch_journal_entries is
  'Owner-only episode journal. Tombstones keep offline device deletions from returning.';
comment on function public.keep_newer_watch_journal_version() is
  'Skips stale journal upserts so concurrent devices cannot replace a newer client version.';
