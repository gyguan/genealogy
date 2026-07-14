# PostgreSQL startup diagnostic

Health passed: false

```text
        ('relationship:check_conflict', 505, 'business'),
        ('relationship:submit_review', 506, 'business'),
        ('source:view', 601, 'business'),
        ('source:create', 602, 'business'),
        ('source:update', 603, 'business'),
        ('source:delete', 604, 'business'),
        ('source:bind', 605, 'business'),
        ('attachment:view', 701, 'business'),
        ('attachment:upload', 702, 'business'),
        ('attachment:preview', 703, 'business'),
        ('attachment:download', 704, 'business'),
        ('attachment:delete', 705, 'business'),
        ('review_task:view', 801, 'business'),
        ('review_task:approve', 802, 'business'),
        ('review_task:reject', 803, 'business'),
        ('review_task:assign', 804, 'business'),
        ('export_task:create', 901, 'business'),
        ('export_task:approve', 902, 'business'),
        ('export_task:download', 903, 'business'),
        ('operation_log:view', 1001, 'system'),
        ('operation_log:export', 1002, 'system')
)
insert into app_permission (
    permission_code,
    permission_name,
    permission_type,
    resource_type,
    action_type,
    resource_code,
    action_code,
    module_code,
    permission_category,
    enabled,
    sort_order,
    description,
    system_permission,
    created_at,
    updated_at
)
select permission_code,
       permission_code,
       permission_type,
       split_part(permission_code, ':', 1),
       split_part(permission_code, ':', 2),
       split_part(permission_code, ':', 1),
       split_part(permission_code, ':', 2),
       split_part(permission_code, ':', 1),
       permission_type,
       true,
       sort_order,
       permission_code,
       true,
       now(),
       now()
from permissions
on conflict (permission_code) do update
set permission_name = excluded.permission_name,
    permission_type = excluded.permission_type,
    resource_type = excluded.resource_type,
    action_type = excluded.action_type,
    resource_code = excluded.resource_code,
    action_code = excluded.action_code,
    module_code = excluded.module_code,
    permission_category = excluded.permission_category,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order,
    description = excluded.description,
    system_permission = excluded.system_permission,
    updated_at = now()

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
Caused by: org.flywaydb.core.internal.sqlscript.FlywaySqlScriptException: Migration V22__permission_model_seed_update.sql failed
------------------------------------------------------
SQL State  : 23505
Error Code : 0
Message    : ERROR: duplicate key value violates unique constraint "ux_app_permission_resource_action"
  Detail: Key (resource_code, action_code)=(clan, view) already exists.
Location   : db/migration/V22__permission_model_seed_update.sql (/home/runner/work/genealogy/genealogy/backend/genealogy-backend/nested:/home/runner/work/genealogy/genealogy/backend/genealogy-backend/target/genealogy-backend-0.1.0-SNAPSHOT.jar/!BOOT-INF/classes/!/db/migration/V22__permission_model_seed_update.sql)
Line       : 20
Statement  : -- 2. Seed fine-grained resource:action permissions.
with permissions(permission_code, sort_order, permission_type) as (
    values
        ('clan:view', 101, 'business'),
        ('clan:update', 102, 'business'),
        ('clan:manage_settings', 103, 'business'),
        ('clan:delete', 104, 'business'),
        ('member:invite', 201, 'system'),
        ('member:update_role', 202, 'system'),
        ('member:disable', 203, 'system'),
        ('member:transfer_owner', 204, 'system'),
        ('branch:view', 301, 'business'),
        ('branch:create', 302, 'business'),
        ('branch:update', 303, 'business'),
        ('branch:delete', 304, 'business'),
        ('person:view', 401, 'business'),
        ('person:create', 402, 'business'),
        ('person:update', 403, 'business'),
        ('person:delete', 404, 'business'),
        ('person:submit_review', 405, 'business'),
        ('relationship:view', 501, 'business'),
        ('relationship:create', 502, 'business'),
        ('relationship:update', 503, 'business'),
        ('relationship:delete', 504, 'business'),
        ('relationship:check_conflict', 505, 'business'),
        ('relationship:submit_review', 506, 'business'),
        ('source:view', 601, 'business'),
        ('source:create', 602, 'business'),
        ('source:update', 603, 'business'),
        ('source:delete', 604, 'business'),
        ('source:bind', 605, 'business'),
        ('attachment:view', 701, 'business'),
        ('attachment:upload', 702, 'business'),
        ('attachment:preview', 703, 'business'),
        ('attachment:download', 704, 'business'),
        ('attachment:delete', 705, 'business'),
        ('review_task:view', 801, 'business'),
        ('review_task:approve', 802, 'business'),
        ('review_task:reject', 803, 'business'),
        ('review_task:assign', 804, 'business'),
        ('export_task:create', 901, 'business'),
        ('export_task:approve', 902, 'business'),
        ('export_task:download', 903, 'business'),
        ('operation_log:view', 1001, 'system'),
        ('operation_log:export', 1002, 'system')
)
insert into app_permission (
    permission_code,
    permission_name,
    permission_type,
    resource_type,
    action_type,
    resource_code,
    action_code,
    module_code,
    permission_category,
    enabled,
    sort_order,
    description,
    system_permission,
    created_at,
    updated_at
)
select permission_code,
       permission_code,
       permission_type,
       split_part(permission_code, ':', 1),
       split_part(permission_code, ':', 2),
       split_part(permission_code, ':', 1),
       split_part(permission_code, ':', 2),
       split_part(permission_code, ':', 1),
       permission_type,
       true,
       sort_order,
       permission_code,
       true,
       now(),
       now()
from permissions
on conflict (permission_code) do update
set permission_name = excluded.permission_name,
    permission_type = excluded.permission_type,
    resource_type = excluded.resource_type,
    action_type = excluded.action_type,
    resource_code = excluded.resource_code,
    action_code = excluded.action_code,
    module_code = excluded.module_code,
    permission_category = excluded.permission_category,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order,
    description = excluded.description,
    system_permission = excluded.system_permission,
    updated_at = now()

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
  Detail: Key (resource_code, action_code)=(clan, view) already exists.
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
