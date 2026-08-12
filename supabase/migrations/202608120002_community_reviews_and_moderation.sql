-- Rota stage 6: public anime reviews, spoiler controls and report moderation.
--
-- Public reads and all writes go through narrow RPC functions. The base tables
-- stay closed to the browser so user ids, moderator notes and report details
-- cannot leak through an over-broad PostgREST select.

create table if not exists public.community_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_id text not null,
  body text not null,
  score smallint,
  contains_spoiler boolean not null default false,
  moderation_status text not null default 'PUBLISHED'
    check (moderation_status in ('PUBLISHED', 'HIDDEN', 'REMOVED')),
  moderation_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, anime_id),
  check (char_length(anime_id) between 1 and 300),
  check (char_length(body) between 20 and 2000),
  check (score is null or score between 1 and 10),
  check (char_length(moderation_note) <= 500)
);

create table if not exists public.community_review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.community_reviews(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null
    check (reason in ('SPOILER', 'ABUSE', 'PIRACY', 'SPAM', 'OTHER')),
  detail text not null default '',
  status text not null default 'OPEN'
    check (status in ('OPEN', 'RESOLVED', 'DISMISSED')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (review_id, reporter_id),
  check (char_length(detail) <= 500)
);

create index if not exists community_reviews_anime_published_idx
  on public.community_reviews (anime_id, updated_at desc)
  where moderation_status = 'PUBLISHED';

create index if not exists community_review_reports_open_idx
  on public.community_review_reports (created_at asc)
  where status = 'OPEN';

drop trigger if exists community_reviews_set_updated_at on public.community_reviews;
create trigger community_reviews_set_updated_at
before update on public.community_reviews
for each row execute function public.set_updated_at();

alter table public.community_reviews enable row level security;
alter table public.community_review_reports enable row level security;

revoke all on public.community_reviews from anon, authenticated;
revoke all on public.community_review_reports from anon, authenticated;

create or replace function public.is_rota_moderator()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'rota_role', '')
    in ('owner', 'moderator');
$$;

create or replace function public.get_anime_reviews(p_anime_id text)
returns table (
  id uuid,
  anime_id text,
  body text,
  score smallint,
  contains_spoiler boolean,
  author_name text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    review.id,
    review.anime_id,
    review.body,
    review.score,
    review.contains_spoiler,
    coalesce(nullif(btrim(profile.display_name), ''), 'Anime yolcusu') as author_name,
    review.created_at,
    review.updated_at
  from public.community_reviews as review
  left join public.profiles as profile on profile.id = review.user_id
  where review.anime_id = p_anime_id
    and review.moderation_status = 'PUBLISHED'
  order by review.updated_at desc
  limit 50;
$$;

create or replace function public.get_my_anime_review(p_anime_id text)
returns table (
  id uuid,
  anime_id text,
  body text,
  score smallint,
  contains_spoiler boolean,
  moderation_status text,
  moderation_note text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    review.id,
    review.anime_id,
    review.body,
    review.score,
    review.contains_spoiler,
    review.moderation_status,
    review.moderation_note,
    review.created_at,
    review.updated_at
  from public.community_reviews as review
  where review.user_id = auth.uid()
    and review.anime_id = p_anime_id
  limit 1;
$$;

create or replace function public.save_anime_review(
  p_anime_id text,
  p_body text,
  p_score smallint default null,
  p_contains_spoiler boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_review_id uuid;
  v_existing_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_anime_id is null or char_length(p_anime_id) not between 1 and 300 then
    raise exception 'Invalid anime id' using errcode = '22023';
  end if;
  if char_length(v_body) not between 20 and 2000 then
    raise exception 'Review body must be between 20 and 2000 characters' using errcode = '22023';
  end if;
  if p_score is not null and p_score not between 1 and 10 then
    raise exception 'Score must be between 1 and 10' using errcode = '22023';
  end if;
  if v_body ~* '(https?://|www\.)' then
    raise exception 'Links are not allowed in reviews' using errcode = '22023';
  end if;

  select review.moderation_status
    into v_existing_status
  from public.community_reviews as review
  where review.user_id = v_user_id and review.anime_id = p_anime_id
  for update;

  if v_existing_status in ('HIDDEN', 'REMOVED') then
    raise exception 'Moderated reviews cannot be edited' using errcode = '55000';
  end if;

  if v_existing_status is null and (
    select count(*)
    from public.community_reviews as review
    where review.user_id = v_user_id
      and review.created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Review creation rate limit reached' using errcode = '54000';
  end if;

  insert into public.community_reviews (
    user_id,
    anime_id,
    body,
    score,
    contains_spoiler
  ) values (
    v_user_id,
    p_anime_id,
    v_body,
    p_score,
    coalesce(p_contains_spoiler, false)
  )
  on conflict (user_id, anime_id) do update
  set body = excluded.body,
      score = excluded.score,
      contains_spoiler = excluded.contains_spoiler
  returning id into v_review_id;

  return v_review_id;
end;
$$;

create or replace function public.delete_my_anime_review(p_review_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  delete from public.community_reviews
  where id = p_review_id
    and user_id = auth.uid()
    and moderation_status = 'PUBLISHED';

  if found then return true; end if;

  if exists (
    select 1
    from public.community_reviews
    where id = p_review_id and user_id = auth.uid()
  ) then
    raise exception 'Moderated reviews require an account data request' using errcode = '55000';
  end if;

  return false;
end;
$$;

create or replace function public.report_anime_review(
  p_review_id uuid,
  p_reason text,
  p_detail text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_author_id uuid;
  v_review_status text;
  v_report_id uuid;
  v_detail text := btrim(coalesce(p_detail, ''));
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_reason not in ('SPOILER', 'ABUSE', 'PIRACY', 'SPAM', 'OTHER') then
    raise exception 'Invalid report reason' using errcode = '22023';
  end if;
  if char_length(v_detail) > 500 then
    raise exception 'Report detail is too long' using errcode = '22023';
  end if;

  select review.user_id, review.moderation_status
    into v_author_id, v_review_status
  from public.community_reviews as review
  where review.id = p_review_id;

  if v_author_id is null or v_review_status <> 'PUBLISHED' then
    raise exception 'Review is not available' using errcode = '22023';
  end if;
  if v_author_id = v_user_id then
    raise exception 'Authors cannot report their own review' using errcode = '22023';
  end if;
  if (
    select count(*)
    from public.community_review_reports as report
    where report.reporter_id = v_user_id
      and report.created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'Report rate limit reached' using errcode = '54000';
  end if;

  insert into public.community_review_reports (review_id, reporter_id, reason, detail)
  values (p_review_id, v_user_id, p_reason, v_detail)
  on conflict (review_id, reporter_id) do nothing
  returning id into v_report_id;

  if v_report_id is null then
    raise exception 'Review already reported' using errcode = '23505';
  end if;

  return v_report_id;
end;
$$;

create or replace function public.get_review_moderation_queue()
returns table (
  report_id uuid,
  review_id uuid,
  anime_id text,
  review_body text,
  author_name text,
  reason text,
  detail text,
  review_status text,
  reported_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_rota_moderator() then
    raise exception 'Moderator role required' using errcode = '42501';
  end if;

  return query
  select
    report.id,
    review.id,
    review.anime_id,
    review.body,
    coalesce(nullif(btrim(profile.display_name), ''), 'Anime yolcusu'),
    report.reason,
    report.detail,
    review.moderation_status,
    report.created_at
  from public.community_review_reports as report
  join public.community_reviews as review on review.id = report.review_id
  left join public.profiles as profile on profile.id = review.user_id
  where report.status = 'OPEN'
  order by report.created_at asc
  limit 100;
end;
$$;

create or replace function public.moderate_anime_review(
  p_review_id uuid,
  p_review_status text,
  p_note text default ''
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_rota_moderator() then
    raise exception 'Moderator role required' using errcode = '42501';
  end if;
  if p_review_status not in ('PUBLISHED', 'HIDDEN', 'REMOVED') then
    raise exception 'Invalid moderation status' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) > 500 then
    raise exception 'Moderation note is too long' using errcode = '22023';
  end if;

  update public.community_reviews
  set moderation_status = p_review_status,
      moderation_note = btrim(coalesce(p_note, ''))
  where id = p_review_id;

  if not found then return false; end if;

  update public.community_review_reports
  set status = case when p_review_status = 'PUBLISHED' then 'DISMISSED' else 'RESOLVED' end,
      resolved_at = now()
  where review_id = p_review_id and status = 'OPEN';

  return true;
end;
$$;

revoke all on function public.is_rota_moderator() from public;
revoke all on function public.get_anime_reviews(text) from public;
revoke all on function public.get_my_anime_review(text) from public;
revoke all on function public.save_anime_review(text, text, smallint, boolean) from public;
revoke all on function public.delete_my_anime_review(uuid) from public;
revoke all on function public.report_anime_review(uuid, text, text) from public;
revoke all on function public.get_review_moderation_queue() from public;
revoke all on function public.moderate_anime_review(uuid, text, text) from public;

grant execute on function public.get_anime_reviews(text) to anon, authenticated;
grant execute on function public.is_rota_moderator() to authenticated;
grant execute on function public.get_my_anime_review(text) to authenticated;
grant execute on function public.save_anime_review(text, text, smallint, boolean) to authenticated;
grant execute on function public.delete_my_anime_review(uuid) to authenticated;
grant execute on function public.report_anime_review(uuid, text, text) to authenticated;
grant execute on function public.get_review_moderation_queue() to authenticated;
grant execute on function public.moderate_anime_review(uuid, text, text) to authenticated;

comment on table public.community_reviews is
  'One public review per user and anime. Browser access is RPC-only.';
comment on table public.community_review_reports is
  'Private moderation reports. Reports never hide content automatically.';
