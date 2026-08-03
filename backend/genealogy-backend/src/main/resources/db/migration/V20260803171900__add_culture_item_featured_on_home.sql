-- Align the current culture domain schema with the already implemented
-- CultureItemEntity.featuredOnHome and CultureSiteEntity.featuredOnHome fields.
-- Both Java fields existed before their PostgreSQL columns were migrated.

alter table culture_item
    add column if not exists featured_on_home boolean not null default false;

alter table culture_site
    add column if not exists featured_on_home boolean not null default false;

create index if not exists idx_culture_item_featured_home
    on culture_item (clan_id, sort_order, id)
    where deleted_at is null
      and featured_on_home = true
      and data_status = 'official';

create index if not exists idx_culture_site_featured_home
    on culture_site (clan_id, sort_order, id)
    where deleted_at is null
      and featured_on_home = true
      and data_status = 'official';

comment on column culture_item.featured_on_home is
    'Whether an official culture item is selected for clan home-page display.';

comment on column culture_site.featured_on_home is
    'Whether an official culture site is selected for clan home-page display.';
