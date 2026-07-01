-- Align revision snapshot columns with JPA entity string fields.
-- Hibernate validates String fields as varchar/text, while previous consolidated schema used jsonb.

alter table revision
    alter column before_data type text using before_data::text;

alter table revision
    alter column after_data type text using after_data::text;
