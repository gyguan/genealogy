-- Auth session table for lightweight token-based login

create table if not exists app_auth_session (
    id bigserial primary key,
    user_id bigint not null references app_user(id) on delete cascade,
    token_hash varchar(128) not null unique,
    issued_at timestamp not null,
    expires_at timestamp not null,
    revoked_at timestamp,
    client_ip varchar(64),
    user_agent varchar(500)
);

create index if not exists idx_app_auth_session_user on app_auth_session(user_id);
create index if not exists idx_app_auth_session_token_hash on app_auth_session(token_hash);
create index if not exists idx_app_auth_session_expires_at on app_auth_session(expires_at);
