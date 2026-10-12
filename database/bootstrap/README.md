# Fresh database baseline (PostgreSQL 16)

## Goal

Replace the historic Flyway ALTER/UPDATE/recovery chain with **one clean final-state schema** and **one minimal authorization seed** for a brand-new database. No upgrade path for old databases is required.

The current `db/migration` directory is historical input **until the generated baseline is reviewed and activated**. Do not copy its migrations alongside the generated V1/V2 files.

## Produce an accurate baseline

From repository root on a machine with Docker, Java 17, Maven 3.9+ and a POSIX shell:

```bash
bash database/bootstrap/generate-baseline.sh
```

It starts a **disposable PostgreSQL 16 container**, migrates with the current real Spring Boot/Flyway configuration, dumps the resulting schema (rather than concatenating obsolete ALTER migrations), exports the current `app_role`, `app_permission` and `app_role_permission` reference records, then applies both dumps into a second empty database as a smoke check. It does not access or delete existing databases.

Generated files (ignored until checked in intentionally):

- `database/bootstrap/generated/V1__create_current_schema.sql`: final tables, FKs, checks, indexes, sequences, functions;
- `database/bootstrap/generated/V2__seed_system_authorization.sql`: system roles, permission definitions and role grants;
- `application-startup.log` and `verify.log`: evidence and any failures.

## Activation checklist (destructive baseline reset)

1. Fix any legacy Flyway bootstrap failure surfaced by the generator in an isolated branch; do not silently skip failed scripts.
2. Review SQL for accidental credentials, demo data and obsolete objects; remove obsolete tables only after checking JPA/MyBatis entity mappings and direct SQL use.
3. Move all historical `V*.sql` and callbacks **outside** the active `db/migration` directory. Keep only generated `V1` and `V2`, plus later new migrations. The legacy archive must not be on Flyway's classpath.
4. Keep sample datasets in `db/seed/demo` and test/performance datasets in `db/seed/test`; do not auto-load them with Flyway.
5. Re-run on a **second fresh database** with only the two new migrations; assert Flyway succeeds, Hibernate mappings validate, core authentication/authorization APIs work, and test suites pass.
6. Update `.github/scripts/validate-flyway-migrations.py` / migration-governance workflow rules to explicitly accept this one-time baseline reset and enforce immutability from the new baseline onward.
7. Activate the new baseline only in brand-new environments (or by dropping/recreating a disposable local DB). No migration or retention of preexisting data is provided.

### Caveats

A schema-only dump may expose legacy tables still present at the end of the old upgrade history. It is a **mechanical starting point**, not evidence that the schema is fully normalized. RBAC dump uses IDs allocated by the clean bootstrap; do not seed a nonempty database with it. The generated SQL requires review, further cleanup, and application tests before replacement of the runtime migration directory.

**Status:** This tooling prepares the fresh baseline; it does not yet replace the running Flyway migration set.
