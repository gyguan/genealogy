-- Align clan_member table with member entity

alter table clan_member add column if not exists role_id bigint not null default 0;
alter table clan_member add column if not exists member_status varchar(32) not null default 'ACTIVE';
alter table clan_member add column if not exists scope_type varchar(32) not null default 'CLAN';
alter table clan_member add column if not exists scope_id bigint;
alter table clan_member add column if not exists updated_at timestamp;
