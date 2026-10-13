# Fresh PostgreSQL database baseline

This repository now treats the database as a **fresh-install baseline**. Pre-reset databases are not an upgrade target.

## Runtime Flyway layout

Active runtime migrations:

```text
backend/genealogy-backend/src/main/resources/db/migration/
├── V1__create_current_schema.sql
└── V2__seed_system_authorization.sql
```

- **V1** contains the current PostgreSQL schema: tables, sequences, constraints and indexes.
- **V2** contains only system authorization reference data: built-in roles, permissions and role-permission grants.
- Demo accounts, genealogy examples, performance data and test scenarios are **not** loaded by Flyway.
- `application.yml` uses the standard `classpath:db/migration` location.

The baseline currently contains 38 application tables. Migration-only compatibility objects such as `role`, `clan_member_legacy`, `member_role_scope_migration_2026071301` and the `clan_member` compatibility view are intentionally excluded.

## Legacy archive

The pre-consolidation Flyway chain is preserved only for audit and reproducibility:

```text
database/archive/legacy-flyway/
```

Nothing under `database/archive/` is on the application classpath or executed during startup. Do not add the archive to normal Flyway locations.

Existing databases that contain the old Flyway history are unsupported by this baseline. Recreate the database deliberately after taking any required backup. The application never runs `clean`, `repair`, or destructive database recreation automatically.

## Reproduce and verify the baseline

Requirements: Docker, Java 17, Maven 3.9+, PostgreSQL 16 container support.

From the repository root:

```bash
bash database/bootstrap/generate-baseline.sh
```

The script:

1. creates an isolated PostgreSQL 16 database;
2. replays the archived legacy chain only as historical input;
3. removes migration-only compatibility objects;
4. reconstructs the final schema with `pg_dump`;
5. exports only the current RBAC reference rows;
6. replays the generated V1/V2 into another empty database;
7. starts the real Spring Boot application against a third empty database using the generated V1/V2.

CI additionally requires the generated V1/V2 files to be byte-for-byte identical to the checked-in active migrations.

CI also runs `database/bootstrap/check-java-schema-contract.py` to verify the current Java/MyBatis runtime against V1/V2, including:

- every active table has a Java entity mapping;
- BaseMapper entities declare explicit `@TableName`;
- entity columns and Java/PostgreSQL types match;
- `@TableId` / auto-increment sequence contracts match;
- Mapper XML does not reference missing tables or result columns;
- Java state enums remain accepted by database CHECK constraints;
- Java role/permission constants exist in the RBAC seed.

## First account on an empty installation

V2 intentionally does **not** create demo users or a hard-coded administrator. Public registration remains disabled by default and is forbidden in the production profile.

For the first deployment only, provide a bootstrap account explicitly:

```text
GENEALOGY_AUTH_BOOTSTRAP_ADMIN_ENABLED=true
GENEALOGY_AUTH_BOOTSTRAP_ADMIN_USERNAME=<initial-login>
GENEALOGY_AUTH_BOOTSTRAP_ADMIN_PASSWORD=<12-to-64-character-secret>
GENEALOGY_AUTH_BOOTSTRAP_ADMIN_DISPLAY_NAME=<display-name>
```

The application creates this account only when `app_user` is empty. The password is processed by the normal password hashing path and is never stored in V1/V2. After login, create the first clan through the normal API/UI; the existing clan creation flow grants that user the built-in `clan_admin` role for the new clan.

Disable `GENEALOGY_AUTH_BOOTSTRAP_ADMIN_ENABLED` after the first account is created. If any user already exists, bootstrap is skipped.

## Future schema changes

After this reset ships:

- V1 and V2 are immutable.
- `database/archive/legacy-flyway` is immutable.
- New schema/data migrations use `VyyyyMMddHHmmss__action_description.sql` in `db/migration`.
- Optional same-second migrations use `VyyyyMMddHHmmss_NN__...`, where `NN` is 01–99.
- Demo/test/performance data remain under `db/seed` and are applied explicitly.
- Database changes must pass both migration governance and fresh-database startup checks.
