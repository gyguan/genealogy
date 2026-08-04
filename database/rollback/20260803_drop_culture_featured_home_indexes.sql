-- Rollback for V20260803171900__add_culture_featured_home_indexes.sql.

begin;

drop index if exists idx_culture_item_featured_home;
drop index if exists idx_culture_site_featured_home;

commit;
