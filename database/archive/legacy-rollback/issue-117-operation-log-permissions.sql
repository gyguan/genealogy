-- Manual rollback for Issue #117 permission seed.
-- Run only when V20260713184500__add_operation_log_permissions.sql must be compensated.
-- Application code must be rolled back before removing these permissions.

BEGIN;

DELETE FROM app_role_permission role_permission
USING app_role role, app_permission permission
WHERE role_permission.role_id = role.id
  AND role_permission.permission_id = permission.id
  AND role.role_code IN ('clan_admin', 'cross_clan_admin', 'auditor', 'reviewer')
  AND permission.permission_code IN ('operation_log.view', 'operation_log.export');

DELETE FROM app_permission permission
WHERE permission.permission_code IN ('operation_log.view', 'operation_log.export')
  AND NOT EXISTS (
      SELECT 1
      FROM app_role_permission role_permission
      WHERE role_permission.permission_id = permission.id
  );

COMMIT;
