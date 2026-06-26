-- Operation log table

create table operation_log (
    id bigserial primary key,
    clan_id bigint,
    actor_id bigint,
    action_type varchar(64) not null,
    target_type varchar(64) not null,
    target_id bigint,
    summary varchar(500),
    detail text,
    request_id varchar(128),
    client_ip varchar(64),
    created_at timestamp not null default now()
);

create index idx_operation_log_clan_created on operation_log(clan_id, created_at desc);
create index idx_operation_log_target on operation_log(target_type, target_id);
create index idx_operation_log_action on operation_log(action_type);
