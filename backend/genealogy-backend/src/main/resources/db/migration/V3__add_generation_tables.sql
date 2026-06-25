-- Generation scheme tables

create table generation_scheme (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    branch_id bigint references branch(id),
    scheme_name varchar(200) not null,
    poem_text text,
    start_generation int,
    is_default boolean not null default false,
    validation_enabled boolean not null default true,
    strict_mode boolean not null default false,
    status varchar(32) not null default 'active',
    created_at timestamp not null default now()
);

create table generation_word (
    id bigserial primary key,
    scheme_id bigint not null references generation_scheme(id),
    generation_no int not null,
    word varchar(20) not null,
    description varchar(255),
    sort_order int not null default 0,
    unique (scheme_id, generation_no)
);

create index idx_generation_scheme_clan on generation_scheme(clan_id);
create index idx_generation_word_scheme on generation_word(scheme_id);
