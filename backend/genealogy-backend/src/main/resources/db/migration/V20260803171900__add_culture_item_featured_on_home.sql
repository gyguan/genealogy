-- Align the current culture_item schema with CultureItemEntity.featuredOnHome.
-- The field is already part of the implemented current model but was missing
-- from the PostgreSQL migration history.

alter table culture_item
    add column if not exists featured_on_home boolean not null default false;

create index if not exists idx_culture_item_featured_home
    on culture_item (clan_id, sort_order, id)
    where deleted_at is null
      and featured_on_home = true
      and data_status = 'official';

comment on column culture_item.featured_on_home is
    'Whether an official culture item is selected for clan home-page display.';
