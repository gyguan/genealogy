package com.genealogy.relationship.domain;

import com.genealogy.relationship.entity.RelationshipEntity;

import java.util.Objects;

/**
 * Explicit persistence-boundary policy applied by every RelationshipRepository write.
 * This replaces JPA lifecycle callbacks and keeps imports, review application and repairs consistent.
 */
public final class RelationshipWritePolicy {

    private RelationshipWritePolicy() {
    }

    public static void normalizeForWrite(RelationshipEntity entity) {
        Objects.requireNonNull(entity, "relationship entity");
        String type = RelationCategoryPolicy.normalizeType(entity.getRelationType());
        String category = RelationCategoryPolicy.normalizeAndValidate(type, entity.getRelationCategory());
        entity.setRelationType(type);
        entity.setRelationCategory(category);
    }
}
