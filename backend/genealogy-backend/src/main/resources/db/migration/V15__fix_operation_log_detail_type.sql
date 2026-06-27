-- Keep operation_log.detail compatible with text search.
-- Some local databases may have been initialized with detail as bytea before Flyway was aligned.

do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = current_schema()
          and table_name = 'operation_log'
          and column_name = 'detail'
          and data_type = 'bytea'
    ) then
        alter table operation_log
            alter column detail type text
            using encode(detail, 'escape');
    end if;
end $$;
