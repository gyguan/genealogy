from pathlib import Path

path = Path('backend/genealogy-backend/src/main/resources/db/migration/V20260714070000__rebuild_legacy_duplicate_migrations.sql')
text = path.read_text()
old = 'create index if not exists idx_member_role_member on member_role(member_id);\n'
new = r'''do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = current_schema()
          and table_name = 'member_role'
          and column_name = 'member_id'
    ) then
        execute 'create index if not exists idx_member_role_member on member_role(member_id)';
    end if;
end $$;
'''
if old not in text:
    raise SystemExit('legacy member_role index marker not found')
path.write_text(text.replace(old, new, 1))
