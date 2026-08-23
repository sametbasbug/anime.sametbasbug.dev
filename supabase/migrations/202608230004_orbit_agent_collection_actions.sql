-- Stage 21: narrowly authorize the Orbit edge function to manage the same
-- synced collections the human owns. Deletions remain tombstones.

grant select, insert, update on public.personal_collections to service_role;
grant execute on function public.valid_collection_anime_ids(jsonb) to service_role;
