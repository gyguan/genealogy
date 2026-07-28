package com.genealogy.relationship.domain;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.relationship.entity.RelationshipEntity;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RelationCategoryPolicyTest {

    @Test
    void mapsEverySupportedTypeToCanonicalCategory() {
        assertEquals("blood", RelationCategoryPolicy.categoryForType(" parent-child "));
        assertEquals("marriage", RelationCategoryPolicy.categoryForType("SPOUSE"));
        assertEquals("ritual", RelationCategoryPolicy.categoryForType("入继"));
        assertEquals("ritual", RelationCategoryPolicy.categoryForType("dual successor"));
        assertEquals("status", RelationCategoryPolicy.categoryForType("无嗣"));
    }

    @Test
    void acceptsAliasesButRejectsTypeCategoryMismatch() {
        assertEquals("blood", RelationCategoryPolicy.normalizeAndValidate("parent_child", "血缘"));
        assertEquals("marriage", RelationCategoryPolicy.normalizeAndValidate("spouse", null));
        assertThrows(BusinessException.class,
                () -> RelationCategoryPolicy.normalizeAndValidate("spouse", "blood"));
        assertThrows(BusinessException.class,
                () -> RelationCategoryPolicy.normalizeAndValidate("unknown", null));
    }

    @Test
    void entityListenerNormalizesEveryPersistenceWrite() {
        RelationshipEntity entity = new RelationshipEntity();
        entity.setRelationType(" Spouse ");
        entity.setRelationCategory("婚配");

        new RelationshipCategoryEntityListener().normalize(entity);

        assertEquals("spouse", entity.getRelationType());
        assertEquals("marriage", entity.getRelationCategory());
    }
}
