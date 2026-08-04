-- The culture schema already stores featured flags in is_featured_on_home.
-- Add partial indexes for official home-page selections without creating duplicate state.

create index if not exists idx_culture_item_featured_home
    on culture_item (clan_id, sort_order, id)
    where deleted_at is null
      and is_featured_on_home = true
      and data_status = 'official';

create index if not exists idx_culture_site_featured_home
    on culture_site (clan_id, sort_order, id)
    where deleted_at is null
      and is_featured_on_home = true
      and data_status = 'official';

comment on column culture_item.is_featured_on_home is
    'Whether an official culture item is selected for clan home-page display.';

comment on column culture_site.is_featured_on_home is
    'Whether an official culture site is selected for clan home-page display.';
