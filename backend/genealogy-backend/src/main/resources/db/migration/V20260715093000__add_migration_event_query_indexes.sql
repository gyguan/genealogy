-- Issue #170: support database-first migration visibility, ordering and filters.
-- Historical migrations are immutable; this file only adds indexes.

CREATE UNIQUE INDEX IF NOT EXISTS uq_migration_event_branch_sequence_active
    ON migration_event (clan_id, branch_id, sequence_no)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_migration_event_clan_status_sequence
    ON migration_event (clan_id, data_status, sequence_no, id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_migration_event_clan_branch_sequence
    ON migration_event (clan_id, branch_id, sequence_no, id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_migration_event_founder
    ON migration_event (clan_id, founder_person_id)
    WHERE deleted_at IS NULL AND founder_person_id IS NOT NULL;
