-- Manual rollback for Issue #166 culture domain foundation.
-- Applies to: V20260714161000__create_culture_domain_tables.sql
-- Preconditions:
--   1. Confirm no later migration depends on culture_item, migration_event or culture_site.
--   2. Confirm the three tables contain no required business data, or complete an approved backup/export first.
--   3. Stop application writes before execution.
-- Risk: destructive; all data in the three new tables is removed.
-- Verification:
--   select to_regclass('public.culture_item');
--   select to_regclass('public.migration_event');
--   select to_regclass('public.culture_site');
-- After rollback all three results must be null.
-- Do not use this script after production data exists; create a higher-version forward compensation migration instead.

begin;

drop table if exists culture_site;
drop table if exists migration_event;
drop table if exists culture_item;

commit;
