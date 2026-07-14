from pathlib import Path

migration_dir = Path('backend/genealogy-backend/src/main/resources/db/migration')

(migration_dir / 'V21_5__prepare_permission_seed_update.sql').write_text(r'''-- Bridge V9/V11 dot-style codes to the immutable V22 colon-style upsert.
-- Existing databases that already recorded V22 do not execute this lower version.
update app_permission
set permission_code = resource_code || ':' || action_code,
    updated_at = now()
where permission_code = resource_code || '.' || action_code;
''')

forward = migration_dir / 'V20260714070000__rebuild_legacy_duplicate_migrations.sql'
text = forward.read_text()
marker = 'create index if not exists idx_source_binding_active_target on source_binding(source_id, target_type, target_id, binding_status);\n'
addition = marker + r'''

-- Runtime PermissionApplicationService normalizes callers to resource.action.
-- V22 historically seeds resource:action, so normalize after the immutable seed migration.
update app_permission
set permission_code = replace(permission_code, ':', '.'),
    updated_at = now()
where permission_code like '%:%';
'''
if marker not in text:
    raise SystemExit('forward migration marker not found')
forward.write_text(text.replace(marker, addition, 1))
