-- The authenticated writer must be able to evaluate the immutable helper used
-- by personal_collections_anime_ids_check. The helper reads no table data and
-- only validates the JSON value supplied by the caller.

revoke all on function public.valid_collection_anime_ids(jsonb) from public, anon, authenticated;
grant execute on function public.valid_collection_anime_ids(jsonb) to authenticated;

comment on function public.valid_collection_anime_ids(jsonb) is
  'Immutable collection anime-id validator; executable only by authenticated table writers.';
