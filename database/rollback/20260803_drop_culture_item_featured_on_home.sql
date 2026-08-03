-- Rollback for V20260803171900__add_culture_item_featured_on_home.sql.
-- Stop application writes and home-page culture reads before executing.
-- Any featured selections stored in this column will be lost.

begin;

drop index if exists idx_culture_item_featured_home;

alter table culture_item
    drop column if exists featured_on_home;

commit;
