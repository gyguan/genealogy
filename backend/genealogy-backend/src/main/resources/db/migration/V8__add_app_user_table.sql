-- App user table used by auth module

create table if not exists app_user (
    id bigserial primary key,
    username varchar(80) not null unique,
    phone varchar(30) unique,
    email varchar(120) unique,
    password_hash varchar(255) not null,
    display_name varchar(120) not null,
    avatar_url varchar(500),
    status varchar(32),
    last_login_at timestamp,
    created_at timestamp,
    updated_at timestamp,
    deleted_at timestamp
);

create index if not exists idx_app_user_phone on app_user(phone);
create index if not exists idx_app_user_email on app_user(email);
