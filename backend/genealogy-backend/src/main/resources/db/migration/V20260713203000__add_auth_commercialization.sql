-- Issue #133: commercial authentication, controlled onboarding and security audit.
-- This migration is additive and idempotent for environments created from V1__init_schema.sql.

alter table app_auth_session add column if not exists csrf_token_hash varchar(255);
alter table app_auth_session add column if not exists last_access_at timestamp;
alter table app_auth_session add column if not exists device_name varchar(160);
alter table app_auth_session add column if not exists remember_me boolean not null default false;

update app_auth_session
set last_access_at = coalesce(last_access_at, issued_at)
where last_access_at is null;

create unique index if not exists uk_app_auth_session_token_hash
    on app_auth_session(token_hash);
create index if not exists idx_app_auth_session_user_active
    on app_auth_session(user_id, expires_at desc)
    where revoked_at is null;

create table if not exists app_account_invite (
    id bigserial primary key,
    token_hash varchar(255) not null,
    clan_id bigint not null references clan(id),
    email varchar(120),
    role_code varchar(64) not null,
    scope_type varchar(32) not null,
    scope_id bigint not null,
    invited_by bigint not null references app_user(id),
    status varchar(32) not null default 'active',
    expires_at timestamp not null,
    accepted_at timestamp,
    accepted_user_id bigint references app_user(id),
    created_at timestamp not null default now()
);
create unique index if not exists uk_app_account_invite_token_hash
    on app_account_invite(token_hash);
create index if not exists idx_app_account_invite_clan_status_expiry
    on app_account_invite(clan_id, status, expires_at);

create table if not exists app_password_reset_token (
    id bigserial primary key,
    user_id bigint not null references app_user(id),
    token_hash varchar(255) not null,
    expires_at timestamp not null,
    used_at timestamp,
    revoked_at timestamp,
    created_at timestamp not null default now(),
    requested_ip_hash varchar(255)
);
create unique index if not exists uk_app_password_reset_token_hash
    on app_password_reset_token(token_hash);
create index if not exists idx_app_password_reset_user_active
    on app_password_reset_token(user_id, expires_at desc)
    where used_at is null and revoked_at is null;

create table if not exists app_login_attempt (
    id bigserial primary key,
    account_hash varchar(255) not null,
    ip_hash varchar(255) not null,
    user_id bigint references app_user(id),
    success boolean not null,
    result_code varchar(64) not null,
    created_at timestamp not null default now()
);
create index if not exists idx_app_login_attempt_account_window
    on app_login_attempt(account_hash, created_at desc)
    where success = false;
create index if not exists idx_app_login_attempt_ip_window
    on app_login_attempt(ip_hash, created_at desc)
    where success = false;

create table if not exists app_auth_security_event (
    id bigserial primary key,
    user_id bigint references app_user(id),
    event_type varchar(64) not null,
    result_code varchar(64) not null,
    risk_level varchar(32) not null,
    ip_masked varchar(80),
    user_agent varchar(500),
    request_id varchar(100),
    detail varchar(1000),
    created_at timestamp not null default now()
);
create index if not exists idx_app_auth_security_event_user_time
    on app_auth_security_event(user_id, created_at desc);
create index if not exists idx_app_auth_security_event_type_time
    on app_auth_security_event(event_type, created_at desc);
