package com.genealogy.relationship.domain;

import com.genealogy.relationship.entity.RelationshipEntity;

/**
 * Compatibility facade retained for tests and callers that referenced the former listener directly.
 * It is no longer registered as a JPA lifecycle listener; writes are normalized by RelationshipRepository.
 */
@Deprecated(forRemoval = false)
public class RelationshipCategoryEntityListener {

    public void normalize(RelationshipEntity entity) {
        RelationshipWritePolicy.normalizeForWrite(entity);
    }
}
