-- Align review revision snapshot columns with JPA validation.
-- Snapshots remain JSON strings parsed by ReviewApplicationService for field-level diff.

alter table revision
    alter column before_data type text using before_data::text,
    alter column after_data type text using after_data::text;
