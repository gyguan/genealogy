-- Issue #170 rollback/compensation for runtime-only migration indexes.
-- This script does not delete migration_event data and does not restore or write legacy branch migration fields.

drop index if exists idx_revision__migration_event_history;
drop index if exists idx_migration_event__clan_branch_status_sequence;
