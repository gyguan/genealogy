-- Manual rollback for Issue #170 migration-event indexes.
DROP INDEX IF EXISTS idx_migration_event_founder;
DROP INDEX IF EXISTS idx_migration_event_clan_branch_sequence;
DROP INDEX IF EXISTS idx_migration_event_clan_status_sequence;
DROP INDEX IF EXISTS uq_migration_event_branch_sequence_active;
