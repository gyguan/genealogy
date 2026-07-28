-- Normalize legacy relationship type tokens first.
UPDATE relationship
SET relation_type = CASE lower(trim(replace(replace(relation_type, '-', '_'), ' ', '_')))
    WHEN '继嗣' THEN 'in_adoption'
    WHEN '入继' THEN 'in_adoption'
    WHEN '出继' THEN 'out_adoption'
    WHEN '出嗣' THEN 'out_adoption'
    WHEN '承祧' THEN 'successor'
    WHEN '兼祧' THEN 'dual_successor'
    WHEN '嗣子' THEN 'heir_son'
    WHEN '无嗣' THEN 'no_descendant'
    WHEN '继配' THEN 'spouse'
    WHEN '侧室' THEN 'spouse'
    ELSE lower(trim(replace(replace(relation_type, '-', '_'), ' ', '_')))
END
WHERE relation_type IS NOT NULL;

-- Canonical category is derived from type. Unknown historical types retain the
-- legacy query behaviour and are classified as blood without deleting data.
UPDATE relationship
SET relation_category = CASE
    WHEN relation_type = 'spouse' THEN 'marriage'
    WHEN relation_type IN ('adoptive', 'successor', 'out_adoption', 'in_adoption', 'dual_successor', 'heir_son') THEN 'ritual'
    WHEN relation_type = 'no_descendant' THEN 'status'
    ELSE 'blood'
END;

ALTER TABLE relationship ALTER COLUMN relation_category SET DEFAULT 'blood';
ALTER TABLE relationship ALTER COLUMN relation_category SET NOT NULL;

ALTER TABLE relationship DROP CONSTRAINT IF EXISTS ck_relationship_relation_category;
ALTER TABLE relationship ADD CONSTRAINT ck_relationship_relation_category
    CHECK (relation_category IN ('blood', 'ritual', 'marriage', 'status'));

ALTER TABLE relationship DROP CONSTRAINT IF EXISTS ck_relationship_type_category;
ALTER TABLE relationship ADD CONSTRAINT ck_relationship_type_category CHECK (
    (relation_type = 'parent_child' AND relation_category = 'blood') OR
    (relation_type = 'spouse' AND relation_category = 'marriage') OR
    (relation_type IN ('adoptive', 'successor', 'out_adoption', 'in_adoption', 'dual_successor', 'heir_son') AND relation_category = 'ritual') OR
    (relation_type = 'no_descendant' AND relation_category = 'status') OR
    (relation_type NOT IN ('parent_child', 'spouse', 'adoptive', 'successor', 'out_adoption', 'in_adoption', 'dual_successor', 'heir_son', 'no_descendant') AND relation_category = 'blood')
);

CREATE INDEX IF NOT EXISTS idx_relationship_tree_category
    ON relationship (clan_id, relation_category, data_status)
    WHERE deleted_at IS NULL;
