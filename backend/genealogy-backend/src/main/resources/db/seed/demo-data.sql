\set ON_ERROR_STOP on

-- Deprecated: this seed targets an obsolete database model and must not be executed.
-- Use db/seed/current/init-local-test-data.ps1 (Windows) or db/seed/current/*.sql instead.
DO $$
BEGIN
    RAISE EXCEPTION 'Deprecated demo seed. Use db/seed/current for the current schema.';
END $$;
