-- Tree traversal access paths. Partial indexes exclude soft-deleted rows and keep
-- index size stable as audit history grows.

CREATE INDEX IF NOT EXISTS idx_relationship_tree_outgoing
    ON relationship (clan_id, from_person_id, data_status, relation_category, id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_relationship_tree_incoming
    ON relationship (clan_id, to_person_id, data_status, relation_category, id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_relationship_tree_within_people
    ON relationship (clan_id, data_status, relation_category, from_person_id, to_person_id, id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_person_tree_by_id
    ON person (clan_id, id, data_status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_person_tree_by_branch
    ON person (clan_id, branch_id, data_status, generation_no, person_code, id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_branch_tree_subtree
    ON branch (clan_id, parent_id, id);
