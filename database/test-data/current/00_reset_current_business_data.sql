\set ON_ERROR_STOP on

\if :{?confirm_reset}
\else
  \echo 'ERROR: missing -v confirm_reset=RESET_CURRENT_GENEALOGY_DATA'
  \quit 3
\endif

\if :'confirm_reset' != 'RESET_CURRENT_GENEALOGY_DATA'
  \echo 'ERROR: invalid confirm_reset value'
  \quit 3
\endif

select case
         when lower(current_database()) ~ '(prod|prd|production)' then 'true'
         else 'false'
       end as unsafe_database
\gset

\if :unsafe_database
  \echo 'ERROR: refusing to reset a database whose name looks like production'
  \quit 4
\endif

begin;

select pg_advisory_xact_lock(hashtext('genealogy-current-business-data-reset'));

\echo 'Business table row counts before reset:'
select c.relname as table_name,
       coalesce(s.n_live_tup, 0)::bigint as estimated_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_stat_user_tables s on s.relid = c.oid
where n.nspname = current_schema()
  and c.relkind = 'r'
  and c.relname not in (
      'flyway_schema_history',
      'app_role',
      'app_permission',
      'app_role_permission',
      'app_user'
  )
order by c.relname;

do $$
declare
    v_tables text;
begin
    select string_agg(format('%I.%I', n.nspname, c.relname), ', ' order by c.relname)
      into v_tables
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = current_schema()
      and c.relkind = 'r'
      and c.relname not in (
          'flyway_schema_history',
          'app_role',
          'app_permission',
          'app_role_permission',
          'app_user'
      );

    if v_tables is null then
        raise exception 'No resettable business tables were found in schema %', current_schema();
    end if;

    execute 'truncate table ' || v_tables || ' restart identity cascade';
end
$$;

-- Keep login identities, but remove synthetic accounts produced by earlier runs.
delete from app_user
where username like 'scenario\_%' escape '\'
   or username like 'perf\_%' escape '\';

commit;

\echo 'Reset completed. Preserved Flyway history, roles, permissions and non-synthetic users.'
