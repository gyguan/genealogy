ALTER TABLE relationship
    ADD COLUMN IF NOT EXISTS relation_category VARCHAR(32),
    ADD COLUMN IF NOT EXISTS ritual_relation_type VARCHAR(64),
    ADD COLUMN IF NOT EXISTS succession_reason TEXT,
    ADD COLUMN IF NOT EXISTS successor_branch_id BIGINT;

ALTER TABLE relationship
    DROP CONSTRAINT IF EXISTS chk_relationship_not_self;

ALTER TABLE relationship
    ADD CONSTRAINT chk_relationship_not_self
        CHECK (from_person_id <> to_person_id OR relation_type = 'no_descendant');

UPDATE relationship
SET relation_category = CASE
    WHEN relation_type = 'parent_child' THEN 'blood'
    WHEN relation_type = 'spouse' THEN 'marriage'
    WHEN relation_type IN ('adoptive', 'successor', 'out_adoption', 'in_adoption', 'dual_successor', 'heir_son') THEN 'ritual'
    WHEN relation_type = 'no_descendant' THEN 'status'
    ELSE COALESCE(relation_category, 'blood')
END
WHERE relation_category IS NULL;

UPDATE relationship
SET ritual_relation_type = relation_type
WHERE ritual_relation_type IS NULL
  AND relation_category IN ('ritual', 'status');

CREATE INDEX IF NOT EXISTS idx_relationship_category ON relationship (clan_id, relation_category);
CREATE INDEX IF NOT EXISTS idx_relationship_ritual_type ON relationship (clan_id, ritual_relation_type);
CREATE INDEX IF NOT EXISTS idx_relationship_successor_branch ON relationship (clan_id, successor_branch_id);
