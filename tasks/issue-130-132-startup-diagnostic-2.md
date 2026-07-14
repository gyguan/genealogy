# PostgreSQL startup diagnostic 2

Health passed: false

```text
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.doCreateBean(AbstractAutowireCapableBeanFactory.java:600) ~[spring-beans-6.1.14.jar!/:6.1.14]
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.createBean(AbstractAutowireCapableBeanFactory.java:522) ~[spring-beans-6.1.14.jar!/:6.1.14]
	at org.springframework.beans.factory.support.AbstractBeanFactory.lambda$doGetBean$0(AbstractBeanFactory.java:337) ~[spring-beans-6.1.14.jar!/:6.1.14]
	at org.springframework.beans.factory.support.DefaultSingletonBeanRegistry.getSingleton(DefaultSingletonBeanRegistry.java:234) ~[spring-beans-6.1.14.jar!/:6.1.14]
	at org.springframework.beans.factory.support.AbstractBeanFactory.doGetBean(AbstractBeanFactory.java:335) ~[spring-beans-6.1.14.jar!/:6.1.14]
	at org.springframework.beans.factory.support.AbstractBeanFactory.getBean(AbstractBeanFactory.java:200) ~[spring-beans-6.1.14.jar!/:6.1.14]
	at org.springframework.beans.factory.support.AbstractBeanFactory.doGetBean(AbstractBeanFactory.java:313) ~[spring-beans-6.1.14.jar!/:6.1.14]
	at org.springframework.beans.factory.support.AbstractBeanFactory.getBean(AbstractBeanFactory.java:200) ~[spring-beans-6.1.14.jar!/:6.1.14]
	at org.springframework.beans.factory.support.BeanDefinitionValueResolver.resolveReference(BeanDefinitionValueResolver.java:365) ~[spring-beans-6.1.14.jar!/:6.1.14]
	... 101 common frames omitted
Caused by: org.flywaydb.core.internal.command.DbMigrate$FlywayMigrateException: Migration V20260713184500__add_operation_log_permissions.sql failed
-------------------------------------------------------------------
SQL State  : 23505
Error Code : 0
Message    : ERROR: duplicate key value violates unique constraint "ux_app_permission_resource_action"
  Detail: Key (resource_code, action_code)=(operation_log, view) already exists.
  Where: SQL statement "INSERT INTO app_permission (permission_code, permission_name, permission_type, resource_type, action_type, description, system_permission, created_at, updated_at, resource_code, action_code, module_code, permission_category, enabled, sort_order, module_name, status, created_by, updated_by) VALUES ('operation_log.view', '查看操作日志', 'system', 'operation_log', 'view', '查看当前宗族操作日志和审计追踪', true, now(), now(), 'operation_log', 'view', 'operation_log', 'system', true, 1001, '操作日志', 'active', null, null) ON CONFLICT (permission_code) DO UPDATE SET permission_name = excluded.permission_name, permission_type = excluded.permission_type, resource_type = excluded.resource_type, action_type = excluded.action_type, description = excluded.description, system_permission = excluded.system_permission, updated_at = excluded.updated_at, resource_code = excluded.resource_code, action_code = excluded.action_code, module_code = excluded.module_code, permission_category = excluded.permission_category, enabled = excluded.enabled, sort_order = excluded.sort_order, module_name = excluded.module_name, status = excluded.status, updated_by = excluded.updated_by"
PL/pgSQL function inline_code_block line 63 at EXECUTE
Location   : db/migration/V20260713184500__add_operation_log_permissions.sql (/home/runner/work/genealogy/genealogy/backend/genealogy-backend/nested:/home/runner/work/genealogy/genealogy/backend/genealogy-backend/target/genealogy-backend-0.1.0-SNAPSHOT.jar/!BOOT-INF/classes/!/db/migration/V20260713184500__add_operation_log_permissions.sql)
Line       : 9
Statement  : -- Issue #117: add the operation-log permissions required by secured query/export endpoints.
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
END $$

	at org.flywaydb.core.internal.command.DbMigrate.doMigrateGroup(DbMigrate.java:382) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.command.DbMigrate.lambda$applyMigrations$1(DbMigrate.java:272) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.jdbc.TransactionalExecutionTemplate.execute(TransactionalExecutionTemplate.java:55) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.command.DbMigrate.applyMigrations(DbMigrate.java:271) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.command.DbMigrate.migrateGroup(DbMigrate.java:244) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.command.DbMigrate.lambda$migrateAll$0(DbMigrate.java:139) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.database.postgresql.PostgreSQLAdvisoryLockTemplate.execute(PostgreSQLAdvisoryLockTemplate.java:73) ~[flyway-database-postgresql-10.10.0.jar!/:na]
	at org.flywaydb.database.postgresql.PostgreSQLAdvisoryLockTemplate.lambda$execute$0(PostgreSQLAdvisoryLockTemplate.java:56) ~[flyway-database-postgresql-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.jdbc.TransactionalExecutionTemplate.execute(TransactionalExecutionTemplate.java:55) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.database.postgresql.PostgreSQLAdvisoryLockTemplate.execute(PostgreSQLAdvisoryLockTemplate.java:56) ~[flyway-database-postgresql-10.10.0.jar!/:na]
	at org.flywaydb.database.postgresql.PostgreSQLConnection.lock(PostgreSQLConnection.java:96) ~[flyway-database-postgresql-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.schemahistory.JdbcTableSchemaHistory.lock(JdbcTableSchemaHistory.java:145) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.command.DbMigrate.migrateAll(DbMigrate.java:139) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.command.DbMigrate.migrate(DbMigrate.java:97) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.Flyway.lambda$migrate$0(Flyway.java:202) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.FlywayExecutor.execute(FlywayExecutor.java:205) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.Flyway.migrate(Flyway.java:147) ~[flyway-core-10.10.0.jar!/:na]
	at org.springframework.boot.autoconfigure.flyway.FlywayMigrationInitializer.afterPropertiesSet(FlywayMigrationInitializer.java:66) ~[spring-boot-autoconfigure-3.3.5.jar!/:3.3.5]
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.invokeInitMethods(AbstractAutowireCapableBeanFactory.java:1853) ~[spring-beans-6.1.14.jar!/:6.1.14]
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.initializeBean(AbstractAutowireCapableBeanFactory.java:1802) ~[spring-beans-6.1.14.jar!/:6.1.14]
	... 110 common frames omitted
Caused by: org.flywaydb.core.internal.sqlscript.FlywaySqlScriptException: Migration V20260713184500__add_operation_log_permissions.sql failed
-------------------------------------------------------------------
SQL State  : 23505
Error Code : 0
Message    : ERROR: duplicate key value violates unique constraint "ux_app_permission_resource_action"
  Detail: Key (resource_code, action_code)=(operation_log, view) already exists.
  Where: SQL statement "INSERT INTO app_permission (permission_code, permission_name, permission_type, resource_type, action_type, description, system_permission, created_at, updated_at, resource_code, action_code, module_code, permission_category, enabled, sort_order, module_name, status, created_by, updated_by) VALUES ('operation_log.view', '查看操作日志', 'system', 'operation_log', 'view', '查看当前宗族操作日志和审计追踪', true, now(), now(), 'operation_log', 'view', 'operation_log', 'system', true, 1001, '操作日志', 'active', null, null) ON CONFLICT (permission_code) DO UPDATE SET permission_name = excluded.permission_name, permission_type = excluded.permission_type, resource_type = excluded.resource_type, action_type = excluded.action_type, description = excluded.description, system_permission = excluded.system_permission, updated_at = excluded.updated_at, resource_code = excluded.resource_code, action_code = excluded.action_code, module_code = excluded.module_code, permission_category = excluded.permission_category, enabled = excluded.enabled, sort_order = excluded.sort_order, module_name = excluded.module_name, status = excluded.status, updated_by = excluded.updated_by"
PL/pgSQL function inline_code_block line 63 at EXECUTE
Location   : db/migration/V20260713184500__add_operation_log_permissions.sql (/home/runner/work/genealogy/genealogy/backend/genealogy-backend/nested:/home/runner/work/genealogy/genealogy/backend/genealogy-backend/target/genealogy-backend-0.1.0-SNAPSHOT.jar/!BOOT-INF/classes/!/db/migration/V20260713184500__add_operation_log_permissions.sql)
Line       : 9
Statement  : -- Issue #117: add the operation-log permissions required by secured query/export endpoints.
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
END $$

	at org.flywaydb.core.internal.sqlscript.DefaultSqlScriptExecutor.handleException(DefaultSqlScriptExecutor.java:252) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.sqlscript.DefaultSqlScriptExecutor.executeStatement(DefaultSqlScriptExecutor.java:214) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.sqlscript.DefaultSqlScriptExecutor.execute(DefaultSqlScriptExecutor.java:133) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.resolver.sql.SqlMigrationExecutor.executeOnce(SqlMigrationExecutor.java:65) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.resolver.sql.SqlMigrationExecutor.lambda$execute$0(SqlMigrationExecutor.java:57) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.database.DefaultExecutionStrategy.execute(DefaultExecutionStrategy.java:27) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.resolver.sql.SqlMigrationExecutor.execute(SqlMigrationExecutor.java:56) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.command.DbMigrate.doMigrateGroup(DbMigrate.java:374) ~[flyway-core-10.10.0.jar!/:na]
	... 129 common frames omitted
Caused by: org.postgresql.util.PSQLException: ERROR: duplicate key value violates unique constraint "ux_app_permission_resource_action"
  Detail: Key (resource_code, action_code)=(operation_log, view) already exists.
  Where: SQL statement "INSERT INTO app_permission (permission_code, permission_name, permission_type, resource_type, action_type, description, system_permission, created_at, updated_at, resource_code, action_code, module_code, permission_category, enabled, sort_order, module_name, status, created_by, updated_by) VALUES ('operation_log.view', '查看操作日志', 'system', 'operation_log', 'view', '查看当前宗族操作日志和审计追踪', true, now(), now(), 'operation_log', 'view', 'operation_log', 'system', true, 1001, '操作日志', 'active', null, null) ON CONFLICT (permission_code) DO UPDATE SET permission_name = excluded.permission_name, permission_type = excluded.permission_type, resource_type = excluded.resource_type, action_type = excluded.action_type, description = excluded.description, system_permission = excluded.system_permission, updated_at = excluded.updated_at, resource_code = excluded.resource_code, action_code = excluded.action_code, module_code = excluded.module_code, permission_category = excluded.permission_category, enabled = excluded.enabled, sort_order = excluded.sort_order, module_name = excluded.module_name, status = excluded.status, updated_by = excluded.updated_by"
PL/pgSQL function inline_code_block line 63 at EXECUTE
	at org.postgresql.core.v3.QueryExecutorImpl.receiveErrorResponse(QueryExecutorImpl.java:2733) ~[postgresql-42.7.4.jar!/:42.7.4]
	at org.postgresql.core.v3.QueryExecutorImpl.processResults(QueryExecutorImpl.java:2420) ~[postgresql-42.7.4.jar!/:42.7.4]
	at org.postgresql.core.v3.QueryExecutorImpl.execute(QueryExecutorImpl.java:372) ~[postgresql-42.7.4.jar!/:42.7.4]
	at org.postgresql.jdbc.PgStatement.executeInternal(PgStatement.java:517) ~[postgresql-42.7.4.jar!/:42.7.4]
	at org.postgresql.jdbc.PgStatement.execute(PgStatement.java:434) ~[postgresql-42.7.4.jar!/:42.7.4]
	at org.postgresql.jdbc.PgStatement.executeWithFlags(PgStatement.java:356) ~[postgresql-42.7.4.jar!/:42.7.4]
	at org.postgresql.jdbc.PgStatement.executeCachedSql(PgStatement.java:341) ~[postgresql-42.7.4.jar!/:42.7.4]
	at org.postgresql.jdbc.PgStatement.executeWithFlags(PgStatement.java:317) ~[postgresql-42.7.4.jar!/:42.7.4]
	at org.postgresql.jdbc.PgStatement.execute(PgStatement.java:312) ~[postgresql-42.7.4.jar!/:42.7.4]
	at com.zaxxer.hikari.pool.ProxyStatement.execute(ProxyStatement.java:94) ~[HikariCP-5.1.0.jar!/:na]
	at com.zaxxer.hikari.pool.HikariProxyStatement.execute(HikariProxyStatement.java) ~[HikariCP-5.1.0.jar!/:na]
	at org.flywaydb.core.internal.jdbc.JdbcTemplate.executeStatement(JdbcTemplate.java:210) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.sqlscript.ParsedSqlStatement.execute(ParsedSqlStatement.java:89) ~[flyway-core-10.10.0.jar!/:na]
	at org.flywaydb.core.internal.sqlscript.DefaultSqlScriptExecutor.executeStatement(DefaultSqlScriptExecutor.java:206) ~[flyway-core-10.10.0.jar!/:na]
	... 135 common frames omitted

```
