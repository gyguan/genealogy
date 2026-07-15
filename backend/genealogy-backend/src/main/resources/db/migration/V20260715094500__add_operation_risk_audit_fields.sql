-- Purpose: add explicit risk-audit fields, deterministic historical classification and risk-view permission.
-- Issue/PR: #125 / PR #220
-- Risk: medium
-- Lock impact: ADD COLUMN and CHECK constraints take short metadata locks; historical backfill scans operation_log once.
-- Data volume: updates only rows whose action_type is in the stable allowlist below.
-- Compatibility: all new fields are nullable; old application versions continue to read and write operation_log.
-- Rollback/Compensation: stop writing risk fields, then use a higher-version migration to drop indexes, constraints and columns.
-- Verification: validate columns/constraints/indexes and compare classified rows with the exact action_type allowlist.

ALTER TABLE operation_log
    ADD COLUMN IF NOT EXISTS risk_level varchar(16),
    ADD COLUMN IF NOT EXISTS risk_event_type varchar(64),
    ADD COLUMN IF NOT EXISTS disposition_status varchar(32),
    ADD COLUMN IF NOT EXISTS branch_id bigint;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_operation_log__risk_level'
          AND conrelid = 'operation_log'::regclass
    ) THEN
        ALTER TABLE operation_log
            ADD CONSTRAINT ck_operation_log__risk_level
            CHECK (risk_level IS NULL OR risk_level IN ('low', 'medium', 'high', 'critical'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_operation_log__risk_event_type'
          AND conrelid = 'operation_log'::regclass
    ) THEN
        ALTER TABLE operation_log
            ADD CONSTRAINT ck_operation_log__risk_event_type
            CHECK (risk_event_type IS NULL OR risk_event_type IN (
                'permission_change', 'sensitive_access', 'bulk_export',
                'formal_data_change', 'review_anomaly', 'access_denied'
            ));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_operation_log__disposition_status'
          AND conrelid = 'operation_log'::regclass
    ) THEN
        ALTER TABLE operation_log
            ADD CONSTRAINT ck_operation_log__disposition_status
            CHECK (disposition_status IS NULL OR disposition_status IN ('open', 'reviewing', 'resolved', 'accepted'));
    END IF;
END $$;

UPDATE operation_log
SET risk_level = CASE
        WHEN action_type IN ('person_delete', 'relationship_delete') THEN 'critical'
        WHEN action_type IN (
            'member_grant_create', 'member_grant_update', 'member_grant_revoke', 'member_status_update',
            'operation_log_export', 'person_export', 'relationship_export', 'genealogy_book_export', 'attachment_export',
            'source_attachment_download', 'source_attachment_delete', 'authorization_denied', 'permission_denied'
        ) THEN 'high'
        ELSE 'medium'
    END,
    risk_event_type = CASE
        WHEN action_type IN ('member_grant_create', 'member_grant_update', 'member_grant_revoke', 'member_status_update')
            THEN 'permission_change'
        WHEN action_type IN ('operation_log_export', 'person_export', 'relationship_export', 'genealogy_book_export', 'attachment_export')
            THEN 'bulk_export'
        WHEN action_type IN ('source_attachment_preview', 'source_attachment_download')
            THEN 'sensitive_access'
        WHEN action_type IN ('person_delete', 'relationship_delete', 'source_attachment_delete')
            THEN 'formal_data_change'
        WHEN action_type = 'review_reject'
            THEN 'review_anomaly'
        WHEN action_type IN ('authorization_denied', 'permission_denied')
            THEN 'access_denied'
    END,
    disposition_status = CASE
        WHEN action_type IN ('review_reject', 'authorization_denied', 'permission_denied') THEN 'open'
        ELSE 'resolved'
    END
WHERE risk_event_type IS NULL
  AND action_type IN (
      'member_grant_create', 'member_grant_update', 'member_grant_revoke', 'member_status_update',
      'operation_log_export', 'person_export', 'relationship_export', 'genealogy_book_export', 'attachment_export',
      'source_attachment_preview', 'source_attachment_download', 'source_attachment_delete',
      'person_delete', 'relationship_delete', 'review_reject', 'authorization_denied', 'permission_denied'
  );

CREATE INDEX IF NOT EXISTS idx_operation_log__risk_recent
    ON operation_log (clan_id, created_at DESC, id DESC)
    WHERE risk_event_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_operation_log__risk_level_recent
    ON operation_log (clan_id, risk_level, created_at DESC, id DESC)
    WHERE risk_event_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_operation_log__risk_type_recent
    ON operation_log (clan_id, risk_event_type, created_at DESC, id DESC)
    WHERE risk_event_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_operation_log__risk_branch_recent
    ON operation_log (clan_id, branch_id, created_at DESC, id DESC)
    WHERE risk_event_type IS NOT NULL AND branch_id IS NOT NULL;

DO $$
DECLARE
    permission_row record;
    insert_columns text;
    insert_values text;
    update_assignments text;
BEGIN
    SELECT * INTO permission_row
    FROM (VALUES
        ('operation_risk.view', '查看高风险操作审计', 'view_risk', 1003, '查看当前宗族高风险事件、统计和追踪入口')
    ) AS permissions(permission_code, permission_name, action_code, sort_order, description);

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
        'INSERT INTO app_permission (%s) VALUES (%s) ON CONFLICT (permission_code) DO UPDATE SET %s',
        insert_columns, insert_values, update_assignments
    );
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
        || 'SELECT %s FROM app_role r JOIN app_permission p ON '
        || '(r.role_code IN (''clan_admin'', ''cross_clan_admin'', ''auditor'') '
        || 'AND p.permission_code = ''operation_risk.view'') '
        || 'WHERE NOT EXISTS ('
        || 'SELECT 1 FROM app_role_permission existing '
        || 'WHERE existing.role_id = r.id AND existing.permission_id = p.id)',
        grant_columns, grant_values
    );
END $$;
