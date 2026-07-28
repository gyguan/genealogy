package com.genealogy.tree.query;

import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TreeQueryPolicyTest {

    private final TreeQueryPolicy policy = new TreeQueryPolicy(new TreeQueryProperties());

    @Test
    void shouldApplyDefaultsAndNormalizePersonQuery() {
        PersonLineageQuery query = policy.person(10L, null, null, " Official ", null, null, null, 20L);

        assertEquals(TreeDirection.BOTH, query.direction());
        assertEquals(5, query.appliedDepth());
        assertEquals(500, query.maxNodes());
        assertEquals(1000, query.maxEdges());
        assertEquals("official", query.dataView());
        assertTrue(query.relationCategories().contains(RelationCategory.BLOOD));
        assertTrue(query.relationCategories().contains(RelationCategory.RITUAL));
        assertTrue(query.relationCategories().contains(RelationCategory.MARRIAGE));
    }

    @Test
    void shouldForceFamilyDepthToOne() {
        PersonLineageQuery query = policy.person(
                10L, "family", List.of("blood"), null, 20, 100, 200, 20L
        );

        assertEquals(TreeDirection.FAMILY, query.direction());
        assertEquals(1, query.requestedDepth());
        assertEquals(1, query.appliedDepth());
    }

    @Test
    void shouldRejectInvalidDirectionAndScope() {
        assertThrows(BusinessException.class, () ->
                policy.person(10L, "sideways", null, null, null, null, null, 20L));
        assertThrows(BusinessException.class, () ->
                policy.person(10L, "both", List.of("unknown"), null, null, null, null, 20L));
    }

    @Test
    void shouldRejectValuesAboveConfiguredLimit() {
        assertThrows(BusinessException.class, () ->
                policy.person(10L, "both", null, null, 21, null, null, 20L));
        assertThrows(BusinessException.class, () ->
                policy.person(10L, "both", null, null, null, 2001, null, 20L));
        assertThrows(BusinessException.class, () ->
                policy.person(10L, "both", null, null, null, null, 4001, 20L));
    }
}
