# PostgreSQL 16: fresh-install baseline

## Active installation path

`backend/genealogy-backend/src/main/resources/db/baseline/` is the **only default Flyway location** (see `application.yml`):

- `V1__create_current_schema.sql` — final-state database structure, foreign keys, checks and indexes.
- `V2__seed_system_authorization.sql` — system roles, permissions and role grants. No demonstration users or sample genealogies.

Brand-new deployments only. **Existing databases with the previous Flyway history are unsupported**: they must be backed up and recreated deliberately. Never drop a production database as part of application startup.

## Historical SQL

The old `src/main/resources/db/migration/` directory is now an **inactive legacy archive** for auditing and regenerating the baseline. Neither startup nor standard Flyway runs load it. The historical SQL is not deleted to preserve migration provenance; do not put that directory in `spring.flyway.locations` in fresh deployments.

Demo/test/performance data are separate under `db/seed/`, and must be applied **only by explicit action**.

## Rebuild / verify

With Docker, Java 17 and Maven 3.9+ installed, from repository root:

```bash
bash database/bootstrap/generate-baseline.sh
```

The script uses an isolated disposable PostgreSQL 16 container:
1. Runs **legacy migrations** explicitly on a temporary database and starts the backend.
2. Dumps the final schema and exports RBAC using SQL INSERTs, stripping psql-only directives.
3. Executes both generated files in a second scratch database.
4. Boots Spring Boot against a **third empty database** using the generated V1/V2 via Flyway; failure of Flyway, Hibernate or startup fails the check.

CI: `.github/workflows/fresh-database-baseline.yml`. Its successful run is the evidence for this snapshot. Generated output is committed only from the dedicated working branch.

If the checked-in active baseline changes, always verify fresh Flyway startup, Hibernate schema validation, and relevant repository/integration tests before merge. All future schema modifications use higher-numbered Flyway migrations **inside `db/baseline/`** and must not modify V1/V2 after the reset has shipped.

## Important limitations

- The snapshot is intentionally a **mechanical final-state consolidation** of the previous schema (including currently deployed legacy tables). It does **not** automatically delete tables merely because their names look old.
- The system starts without demo users. Initial administrator onboarding must use the supported account provisioning flow, not embed passwords in SQL.
- The existing governance validator for `db/migration` covers legacy history; it needs to be extended to enforce new baseline immutability and naming.
- This reset is destructive **only if an operator intentionally replaces an existing DB**. No automatic clean or repair is performed.
