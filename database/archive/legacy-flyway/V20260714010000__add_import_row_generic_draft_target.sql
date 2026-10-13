ALTER TABLE import_job_row
    ADD COLUMN IF NOT EXISTS draft_target_type VARCHAR(32),
    ADD COLUMN IF NOT EXISTS draft_target_id BIGINT;

UPDATE import_job_row
SET draft_target_type = 'person',
    draft_target_id = draft_person_id
WHERE draft_person_id IS NOT NULL
  AND draft_target_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_import_job_row_draft_target
    ON import_job_row(draft_target_type, draft_target_id)
    WHERE draft_target_id IS NOT NULL;
