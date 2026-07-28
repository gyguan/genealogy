package com.genealogy.relationship.domain;

import com.genealogy.relationship.entity.RelationshipEntity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

/** Guarantees every JPA write path stores a canonical type/category pair. */
public class RelationshipCategoryEntityListener {

    @PrePersist
    @PreUpdate
    public void normalize(RelationshipEntity entity) {
        String type = RelationCategoryPolicy.normalizeType(entity.getRelationType());
        String category = RelationCategoryPolicy.normalizeAndValidate(type, entity.getRelationCategory());
        entity.setRelationType(type);
        entity.setRelationCategory(category);
    }
}
