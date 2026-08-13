-- Production may already have applied the Orbit-managed display-name trigger
-- before its function permission was tightened in the source migration.
-- Repeating the revoke is harmless for fresh databases and closes that gap for
-- existing projects without rewriting migration history.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
