-- Role table used by member module

create table if not exists app_role (
    id bigserial primary key,
    role_code varchar(64) not null unique,
    role_name varchar(100) not null,
    description text,
    system_role boolean,
    created_at timestamp,
    updated_at timestamp
);
