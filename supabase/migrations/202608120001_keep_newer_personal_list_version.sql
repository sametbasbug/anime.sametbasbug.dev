-- Prevent a stale device from overwriting a newer personal-list change when
-- both devices read the same previous cloud version and then upload at once.

create or replace function public.keep_newer_personal_list_version()
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

drop trigger if exists personal_list_entries_keep_newer_version
  on public.personal_list_entries;
create trigger personal_list_entries_keep_newer_version
before update on public.personal_list_entries
for each row execute function public.keep_newer_personal_list_version();

comment on function public.keep_newer_personal_list_version() is
  'Skips stale upsert updates so concurrent devices cannot replace a newer client version.';
