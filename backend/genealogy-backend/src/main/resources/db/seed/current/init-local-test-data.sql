\set ON_ERROR_STOP on

-- Local/test-only one-command seed entry point.
-- Usage from repository root:
--   psql -h localhost -p 5432 -U genealogy -d genealogy --     -f backend/genealogy-backend/src/main/resources/db/seed/current/init-local-test-data.sql
--
-- Caller must pass `-v environment=...` and `-v confirm_reset=RESET_CURRENT_GENEALOGY_DATA` explicitly.
-- The included reset script enforces both values before clearing business data.

\echo '=== [1/3] Reset current business data ==='
\ir 00_reset_business_data.sql

\echo '=== [2/3] Seed deterministic current-model scenarios ==='
\ir 10_seed_current_scenarios.sql

\echo '=== [3/3] Verify seed integrity ==='
\ir 30_verify_seed_data.sql

\echo '=== Local genealogy test data initialization completed ==='
\echo 'Demo accounts: demo_admin, demo_branch_admin, demo_editor, demo_reviewer, demo_viewer'
\echo 'Demo password: Genealogy@123'
