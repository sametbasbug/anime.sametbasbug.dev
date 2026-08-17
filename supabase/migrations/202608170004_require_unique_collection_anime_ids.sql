-- Keep direct API writes within the same uniqueness rule as the local model.

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

revoke all on function public.valid_collection_anime_ids(jsonb) from public, anon, authenticated;
grant execute on function public.valid_collection_anime_ids(jsonb) to authenticated;

comment on function public.valid_collection_anime_ids(jsonb) is
  'Immutable collection anime-id validator; executable only by authenticated table writers.';
