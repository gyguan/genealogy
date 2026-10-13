-- Normalize historical source binding target types before introducing the constraint.
UPDATE source_binding
SET target_type = CASE lower(trim(target_type))
    WHEN 'generationword' THEN 'generation_word'
    WHEN 'generation-word' THEN 'generation_word'
    ELSE lower(trim(target_type))
END
WHERE target_type IS NOT NULL;

ALTER TABLE source_binding
    DROP CONSTRAINT IF EXISTS chk_source_binding_target_type;

ALTER TABLE source_binding
    ADD CONSTRAINT chk_source_binding_target_type
    CHECK (target_type IN ('person', 'relationship', 'branch', 'clan', 'generation_word'))
    NOT VALID;

ALTER TABLE source_binding
    VALIDATE CONSTRAINT chk_source_binding_target_type;
