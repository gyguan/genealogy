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
        assertEquals(5, query.requestedDepth());
        assertEquals(5, query.appliedDepth());
        assertEquals(500, query.maxNodes());
        assertEquals(1000, query.maxEdges());
        assertEquals("official", query.dataView());
        assertEquals(
                List.of("blood", "ritual", "marriage"),
                query.relationScopes()
        );
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
    void shouldNormalizeAndDeduplicateRelationScopesInInputOrder() {
        PersonLineageQuery query = policy.person(
                10L,
                "both",
                List.of(" marriage ", "BLOOD", "marriage", "ritual"),
                null,
                3,
                100,
                200,
                20L
        );

        assertEquals(List.of("marriage", "blood", "ritual"), query.relationScopes());
    }

    @Test
    void shouldBuildBranchQueryWithConfiguredValues() {
        BranchLineageQuery query = policy.branch(
                1L, 2L, false, List.of("status"), " Draft ", 4, 120, 240, 20L
        );

        assertEquals(1L, query.clanId());
        assertEquals(2L, query.branchId());
        assertEquals(false, query.includeSubBranches());
        assertEquals(4, query.requestedDepth());
        assertEquals(4, query.appliedDepth());
        assertEquals(List.of("status"), query.relationScopes());
        assertEquals("draft", query.dataView());
    }

    @Test
    void shouldRejectInvalidDirectionAndScope() {
        assertThrows(BusinessException.class, () ->
                policy.person(10L, "sideways", null, null, null, null, null, 20L));
        assertThrows(BusinessException.class, () ->
                policy.person(10L, "both", List.of("unknown"), null, null, null, null, 20L));
        assertThrows(BusinessException.class, () ->
                policy.person(10L, "both", List.of(" "), null, null, null, null, 20L));
    }

    @Test
    void shouldRejectNonPositiveIdentifiersAndLimits() {
        assertThrows(BusinessException.class, () ->
                policy.person(0L, "both", null, null, null, null, null, 20L));
        assertThrows(BusinessException.class, () ->
                policy.person(10L, "both", null, null, null, null, null, 0L));
        assertThrows(BusinessException.class, () ->
                policy.person(10L, "both", null, null, 0, null, null, 20L));
        assertThrows(BusinessException.class, () ->
                policy.branch(0L, 2L, true, null, null, null, null, null, 20L));
        assertThrows(BusinessException.class, () ->
                policy.branch(1L, -1L, true, null, null, null, null, null, 20L));
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

    @Test
    void shouldRejectInvalidConfiguredLimits() {
        TreeQueryProperties excessive = new TreeQueryProperties();
        excessive.setMaxDepth(TreeQueryProperties.HARD_MAX_DEPTH + 1);
        assertThrows(IllegalStateException.class, () -> new TreeQueryPolicy(excessive));

        TreeQueryProperties inconsistent = new TreeQueryProperties();
        inconsistent.setMaxNodes(100);
        inconsistent.setDefaultNodes(101);
        assertThrows(BusinessException.class, () -> new TreeQueryPolicy(inconsistent));

        TreeQueryProperties nonPositive = new TreeQueryProperties();
        nonPositive.setMaxEdges(0);
        assertThrows(IllegalStateException.class, () -> new TreeQueryPolicy(nonPositive));
    }
}
