-- Navicat-compatible guarded reset for the current genealogy model.
-- PostgreSQL only. Open this complete file in Navicat and execute the entire script.
-- Before execution, change CHANGE_ME below to RESET_CURRENT_GENEALOGY_DATA.
-- Never run this file against a production database.

begin;

-- NAVICAT PARAMETERS: edit only the VALUES row before running the full file.
-- Keep confirm_reset as CHANGE_ME until you are certain this is a disposable non-production database.
create temporary table navicat_reset_parameters (
    environment text not null,
    confirm_reset text not null
) on commit drop;

insert into navicat_reset_parameters(environment, confirm_reset)
values ('local', 'CHANGE_ME');

select set_config(
    'genealogy.seed.environment',
    (select environment from navicat_reset_parameters),
    true
);
select set_config(
    'genealogy.seed.confirm_reset',
    (select confirm_reset from navicat_reset_parameters),
    true
);

-- Prevent accidental execution against an unknown or production-like database.
do $$
declare
    v_environment text := lower(current_setting('genealogy.seed.environment', true));
    v_confirmation text := current_setting('genealogy.seed.confirm_reset', true);
begin
    if v_environment not in ('local', 'dev', 'development', 'test', 'ci', 'perf', 'performance') then
        raise exception 'Refusing reset: environment "%" is not in the allowed non-production list', v_environment;
    end if;
    if v_confirmation <> 'RESET_CURRENT_GENEALOGY_DATA' then
        raise exception 'Refusing reset: edit navicat_reset_parameters.confirm_reset to RESET_CURRENT_GENEALOGY_DATA';
    end if;
end $$;

-- Only one reset/seed operation may run at a time in the database.
select pg_advisory_xact_lock(hashtext('genealogy-current-business-data-reset'));

create temporary table seed_reset_table (
    table_oid oid primary key,
    schema_name text not null,
    table_name text not null
) on commit drop;

-- Discover the current business-data graph from the live schema instead of
-- maintaining a fragile hard-coded table list:
--   1. roots are clan itself and every public table containing clan_id;
--   2. recursively include every FK child of those roots.
-- This covers currently implemented modules such as branch/person/relationship,
-- source, review, import, culture, migration, permissions and their child rows,
-- while preserving app_role/app_permission dictionaries and Flyway history.
with recursive business_table(table_oid, schema_name, table_name) as (
    select c.oid, n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and (
          c.relname = 'clan'
          or exists (
              select 1
              from pg_attribute a
              where a.attrelid = c.oid
                and a.attname = 'clan_id'
                and a.attnum > 0
                and not a.attisdropped
          )
      )

    union

    select child.oid, child_ns.nspname, child.relname
    from business_table parent
    join pg_constraint fk
      on fk.contype = 'f'
     and fk.confrelid = parent.table_oid
    join pg_class child on child.oid = fk.conrelid
    join pg_namespace child_ns on child_ns.oid = child.relnamespace
    where child_ns.nspname = 'public'
      and child.relkind in ('r', 'p')
)
insert into seed_reset_table(table_oid, schema_name, table_name)
select distinct table_oid, schema_name, table_name
from business_table
where table_name <> 'flyway_schema_history';

do $$
declare
    r record;
    v_count bigint;
    v_table_list text;
begin
    if not exists (select 1 from seed_reset_table where table_name = 'clan') then
        raise exception 'Current schema does not contain public.clan; reset aborted';
    end if;

    raise notice 'Business tables selected for reset: %',
        (select string_agg(format('%I.%I', schema_name, table_name), ', ' order by table_name)
         from seed_reset_table);

    for r in
        select schema_name, table_name
        from seed_reset_table
        order by table_name
    loop
        execute format('select count(*) from %I.%I', r.schema_name, r.table_name) into v_count;
        raise notice 'before reset: %.% = % rows', r.schema_name, r.table_name, v_count;
    end loop;

    select string_agg(format('%I.%I', schema_name, table_name), ', ' order by table_name)
    into v_table_list
    from seed_reset_table;

    if v_table_list is null then
        raise exception 'No business tables discovered; reset aborted';
    end if;

    execute 'truncate table ' || v_table_list || ' restart identity cascade';
end $$;

-- Authentication/reference data is intentionally preserved. Remove only
-- ephemeral authentication state that can make deterministic seed accounts
-- unusable after a reset. Immutable app_auth_security_event evidence is retained.
delete from app_auth_session s
using app_user u
where s.user_id = u.id
  and (u.username like 'demo\_%' escape '\' or u.username like 'seed\_%' escape '\');

delete from app_password_reset_token t
using app_user u
where t.user_id = u.id
  and (u.username like 'demo\_%' escape '\' or u.username like 'seed\_%' escape '\');

-- Login-attempt rows are transient throttle counters. Clear the table so stale
-- account or IP failures cannot block the deterministic local/test accounts.
delete from app_login_attempt;

do $$
declare
    r record;
    v_count bigint;
begin
    for r in
        select schema_name, table_name
        from seed_reset_table
        order by table_name
    loop
        execute format('select count(*) from %I.%I', r.schema_name, r.table_name) into v_count;
        if v_count <> 0 then
            raise exception 'Reset verification failed: %.% still contains % rows',
                r.schema_name, r.table_name, v_count;
        end if;
    end loop;
end $$;

commit;

select 'Current genealogy business data reset completed.' as result;
