-- Issue #117: add the operation-log permissions required by secured query/export endpoints.
--
-- Compatibility notes:
-- 1. Historical environments may have either the compact V3 permission schema or later display metadata columns.
-- 2. The migration therefore builds INSERT/UPDATE statements from columns that actually exist.
-- 3. Existing role grants are never deleted or rebuilt.
-- 4. Permission codes use the runtime dot notation expected by PermissionApplicationService.

DO $$
DECLARE
    permission_row record;
    insert_columns text;
    insert_values text;
    update_assignments text;
BEGIN
    FOR permission_row IN
        SELECT *
        FROM (VALUES
            ('operation_log.view', '查看操作日志', 'view', 1001, '查看当前宗族操作日志和审计追踪'),
            ('operation_log.export', '导出操作日志', 'export', 1002, '导出当前宗族操作日志和审计报表')
        ) AS permissions(permission_code, permission_name, action_code, sort_order, description)
    LOOP
        SELECT
            string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position),
            string_agg(
                CASE column_name
                    WHEN 'permission_code' THEN quote_literal(permission_row.permission_code)
                    WHEN 'permission_name' THEN quote_literal(permission_row.permission_name)
                    WHEN 'permission_type' THEN quote_literal('system')
                    WHEN 'resource_type' THEN quote_literal('operation_log')
                    WHEN 'action_type' THEN quote_literal(permission_row.action_code)
                    WHEN 'resource_code' THEN quote_literal('operation_log')
                    WHEN 'action_code' THEN quote_literal(permission_row.action_code)
                    WHEN 'module_code' THEN quote_literal('operation_log')
                    WHEN 'module_name' THEN quote_literal('操作日志')
                    WHEN 'permission_category' THEN quote_literal('system')
                    WHEN 'enabled' THEN 'true'
                    WHEN 'sort_order' THEN permission_row.sort_order::text
                    WHEN 'description' THEN quote_literal(permission_row.description)
                    WHEN 'system_permission' THEN 'true'
                    WHEN 'status' THEN quote_literal('active')
                    WHEN 'created_by' THEN 'null'
                    WHEN 'created_at' THEN 'now()'
                    WHEN 'updated_by' THEN 'null'
                    WHEN 'updated_at' THEN 'now()'
                END,
                ', ' ORDER BY ordinal_position
            ),
            string_agg(
                CASE
                    WHEN column_name IN ('permission_code', 'created_by', 'created_at') THEN null
                    ELSE format('%1$I = excluded.%1$I', column_name)
                END,
                ', ' ORDER BY ordinal_position
            )
        INTO insert_columns, insert_values, update_assignments
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'app_permission'
          AND column_name IN (
              'permission_code', 'permission_name', 'permission_type', 'resource_type', 'action_type',
              'resource_code', 'action_code', 'module_code', 'module_name', 'permission_category',
              'enabled', 'sort_order', 'description', 'system_permission', 'status',
              'created_by', 'created_at', 'updated_by', 'updated_at'
          );

        IF insert_columns IS NULL OR insert_values IS NULL THEN
            RAISE EXCEPTION 'app_permission schema is unavailable';
        END IF;

        EXECUTE format(
            'INSERT INTO app_permission (%s) VALUES (%s) '
            || 'ON CONFLICT (permission_code) DO UPDATE SET %s',
            insert_columns,
            insert_values,
            update_assignments
        );
    END LOOP;
END $$;

DO $$
DECLARE
    grant_columns text;
    grant_values text;
BEGIN
    SELECT
        string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position),
        string_agg(
            CASE column_name
                WHEN 'role_id' THEN 'r.id'
                WHEN 'permission_id' THEN 'p.id'
                WHEN 'effect' THEN quote_literal('allow')
                WHEN 'status' THEN quote_literal('active')
                WHEN 'created_by' THEN 'null'
                WHEN 'created_at' THEN 'now()'
                WHEN 'updated_by' THEN 'null'
                WHEN 'updated_at' THEN 'now()'
            END,
            ', ' ORDER BY ordinal_position
        )
    INTO grant_columns, grant_values
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'app_role_permission'
      AND column_name IN (
          'role_id', 'permission_id', 'effect', 'status',
          'created_by', 'created_at', 'updated_by', 'updated_at'
      );

    IF grant_columns IS NULL OR grant_values IS NULL THEN
        RAISE EXCEPTION 'app_role_permission schema is unavailable';
    END IF;

    EXECUTE format(
        'INSERT INTO app_role_permission (%s) '
        || 'SELECT %s '
        || 'FROM app_role r '
        || 'JOIN app_permission p ON ('
        || '  (r.role_code IN (''clan_admin'', ''cross_clan_admin'', ''auditor'') '
        || '   AND p.permission_code IN (''operation_log.view'', ''operation_log.export'')) '
        || '  OR (r.role_code = ''reviewer'' AND p.permission_code = ''operation_log.view'')'
        || ') '
        || 'WHERE NOT EXISTS ('
        || '  SELECT 1 FROM app_role_permission existing '
        || '  WHERE existing.role_id = r.id AND existing.permission_id = p.id'
        || ')',
        grant_columns,
        grant_values
    );
END $$;
