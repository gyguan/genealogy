package com.genealogy.tree.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.quality.domain.GenealogyQualityRuleService;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import com.genealogy.tree.dto.TreeEdgeResponse;
import com.genealogy.tree.dto.TreeGraphMeta;
import com.genealogy.tree.dto.TreeGraphResponse;
import com.genealogy.tree.dto.TreeNodeResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TreeSummaryApplicationServiceTest {

    private static final Long CLAN_ID = 1L;
    private static final Long ACTOR_ID = 99L;

    @Mock
    private AuthorizationApplicationService authorizationApplicationService;
    @Mock
    private SourceBindingRepository sourceBindingRepository;
    @Mock
    private SourceRepository sourceRepository;
    @Mock
    private RevisionRepository revisionRepository;
    @Mock
    private ReviewTaskRepository reviewTaskRepository;
    @Mock
    private GenealogyQualityRuleService qualityRuleService;

    @InjectMocks
    private TreeSummaryApplicationService service;

    @Test
    void enrichesVisibleGraphWithBatchEvidenceReviewAndAnomalySummaries() {
        TreeGraphResponse graph = graph();
        when(sourceBindingRepository.findTreeBindingsByTargets(
                eq(CLAN_ID), eq(Set.of("person", "relationship")), anyCollection()
        )).thenReturn(List.of(
                binding(1L, "person", 1L, 100L, "high"),
                binding(2L, "relationship", 10L, 100L, "medium")
        ));
        when(sourceRepository.findTreeSourcesByIds(CLAN_ID, Set.of(100L)))
                .thenReturn(List.of(officialSource(100L)));
        when(revisionRepository.findTreeRevisionsByTargets(
                eq(CLAN_ID), eq(Set.of("person", "relationship")), anyCollection()
        )).thenReturn(List.of(
                revision(201L, "person", 1L, "pending"),
                revision(202L, "person", 2L, "rejected"),
                revision(203L, "relationship", 10L, "applied")
        ));
        when(reviewTaskRepository.findTreeReviewTasksByRevisionIds(
                CLAN_ID, Set.of(201L, 202L, 203L)
        )).thenReturn(List.of(
                reviewTask(301L, 201L, "pending"),
                reviewTask(302L, 202L, "rejected"),
                reviewTask(303L, 203L, "approved")
        ));

        when(qualityRuleService.personAnomalyCodes(graph.nodes().get(0), false, false)).thenReturn(List.of());
        when(qualityRuleService.personAnomalyCodes(graph.nodes().get(1), true, false)).thenReturn(List.of("missing_source"));
        when(qualityRuleService.personAnomalyCodes(graph.nodes().get(2), true, true))
                .thenReturn(List.of("generation_mismatch", "missing_source", "isolated_person"));
        when(qualityRuleService.relationshipAnomalyCodes(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(true),
                eq(false)
        )).thenReturn(List.of("possible_duplicate", "generation_mismatch"));
        when(qualityRuleService.relationshipAnomalyCodes(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(true),
                eq(true)
        )).thenReturn(List.of("possible_duplicate", "missing_source", "generation_mismatch"));
        when(qualityRuleService.relationshipAnomalyCodes(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(false),
                eq(true)
        )).thenReturn(List.of("missing_source"));
        when(qualityRuleService.highestRisk(List.of())).thenReturn("none");
        when(qualityRuleService.highestRisk(List.of("missing_source"))).thenReturn("low");
        when(qualityRuleService.highestRisk(List.of("generation_mismatch", "missing_source", "isolated_person"))).thenReturn("medium");
        when(qualityRuleService.highestRisk(List.of("possible_duplicate", "generation_mismatch"))).thenReturn("medium");
        when(qualityRuleService.highestRisk(List.of("possible_duplicate", "missing_source", "generation_mismatch"))).thenReturn("medium");

        TreeGraphResponse enriched = service.enrich(CLAN_ID, ACTOR_ID, graph);

        TreeNodeResponse first = enriched.nodes().get(0);
        TreeNodeResponse second = enriched.nodes().get(1);
        TreeNodeResponse isolated = enriched.nodes().get(2);
        assertEquals(1, first.evidenceSummary().bindingCount());
        assertEquals(1, first.evidenceSummary().officialBindingCount());
        assertEquals("high", first.evidenceSummary().confidenceLevel());
        assertFalse(first.evidenceSummary().missingOfficialEvidence());
        assertEquals("pending", first.reviewSummary().state());
        assertEquals(1, first.reviewSummary().pendingTaskCount());
        assertEquals("rejected", second.reviewSummary().state());
        assertTrue(second.evidenceSummary().missingOfficialEvidence());
        assertEquals(Set.of("generation_mismatch", "missing_source", "isolated_person"), Set.copyOf(isolated.anomalySummary().codes()));

        TreeEdgeResponse firstEdge = enriched.edges().get(0);
        TreeEdgeResponse duplicateEdge = enriched.edges().get(1);
        TreeEdgeResponse spouse = enriched.edges().get(2);
        assertEquals("medium", firstEdge.evidenceSummary().confidenceLevel());
        assertEquals("approved", firstEdge.reviewSummary().state());
        assertTrue(firstEdge.anomalySummary().codes().contains("possible_duplicate"));
        assertTrue(duplicateEdge.evidenceSummary().missingOfficialEvidence());
        assertEquals("spouse", spouse.relationType());
        assertEquals("marriage", spouse.relationCategory());
        assertEquals(Boolean.FALSE, spouse.isPrimary());

        verify(sourceBindingRepository, times(1)).findTreeBindingsByTargets(
                eq(CLAN_ID), eq(Set.of("person", "relationship")), anyCollection()
        );
        verify(sourceRepository, times(1)).findTreeSourcesByIds(CLAN_ID, Set.of(100L));
        verify(revisionRepository, times(1)).findTreeRevisionsByTargets(
                eq(CLAN_ID), eq(Set.of("person", "relationship")), anyCollection()
        );
        verify(reviewTaskRepository, times(1)).findTreeReviewTasksByRevisionIds(
                CLAN_ID, Set.of(201L, 202L, 203L)
        );
    }

    @Test
    void omitsProtectedSummariesWithoutPermissionsAndDoesNotQueryFacts() {
        doThrow(new BusinessException("AUTH_FORBIDDEN", "forbidden"))
                .when(authorizationApplicationService).requirePermission(CLAN_ID, ACTOR_ID, "source:view");
        doThrow(new BusinessException("AUTH_FORBIDDEN", "forbidden"))
                .when(authorizationApplicationService).requirePermission(CLAN_ID, ACTOR_ID, "review_task:view");
        doThrow(new BusinessException("AUTH_FORBIDDEN", "forbidden"))
                .when(authorizationApplicationService).requirePermission(CLAN_ID, ACTOR_ID, "workbench:view");

        TreeGraphResponse enriched = service.enrich(CLAN_ID, ACTOR_ID, graph());

        enriched.nodes().forEach(node -> {
            assertNull(node.evidenceSummary());
            assertNull(node.reviewSummary());
            assertNull(node.anomalySummary());
        });
        enriched.edges().forEach(edge -> {
            assertNull(edge.evidenceSummary());
            assertNull(edge.reviewSummary());
            assertNull(edge.anomalySummary());
        });
        verify(sourceBindingRepository, never()).findTreeBindingsByTargets(eq(CLAN_ID), anyCollection(), anyCollection());
        verify(revisionRepository, never()).findTreeRevisionsByTargets(eq(CLAN_ID), anyCollection(), anyCollection());
    }

    private TreeGraphResponse graph() {
        List<TreeNodeResponse> nodes = List.of(
                node("person-1", 1L, "甲", 1, "承"),
                node("person-2", 2L, "乙", 1, "启"),
                node("person-3", 3L, "丙", null, null)
        );
        List<TreeEdgeResponse> edges = List.of(
                edge("relationship-10", 10L, "person-1", 1L, "person-2", 2L, "parent_child", "blood", true),
                edge("relationship-11", 11L, "person-1", 1L, "person-2", 2L, "parent_child", "blood", true),
                edge("relationship-12", 12L, "person-1", 1L, "person-2", 2L, "secondary_spouse", null, false)
        );
        return new TreeGraphResponse(
                "person-1",
                1L,
                "both",
                "official",
                nodes,
                edges,
                new TreeGraphMeta(5, 5, 3, 3, false, List.of(), false, 0, OffsetDateTime.now()),
                List.of()
        );
    }

    private TreeNodeResponse node(String nodeId, Long personId, String name, Integer generation, String word) {
        return new TreeNodeResponse(
                nodeId, personId, name, name, "visible", null, "male", generation, word,
                10L, "长房", null, null, "official", "clan_only"
        );
    }

    private TreeEdgeResponse edge(
            String edgeId,
            Long relationshipId,
            String fromNodeId,
            Long fromPersonId,
            String toNodeId,
            Long toPersonId,
            String relationType,
            String category,
            boolean lineage
    ) {
        return new TreeEdgeResponse(
                edgeId, relationshipId, fromNodeId, fromPersonId, toNodeId, toPersonId,
                relationType, null, category, null, "visible", lineage,
                null, null, "official", null
        );
    }

    private SourceBindingEntity binding(Long id, String targetType, Long targetId, Long sourceId, String confidence) {
        SourceBindingEntity binding = new SourceBindingEntity();
        binding.setId(id);
        binding.setClanId(CLAN_ID);
        binding.setTargetType(targetType);
        binding.setTargetId(targetId);
        binding.setSourceId(sourceId);
        binding.setBindingStatus("official");
        binding.setConfidenceLevel(confidence);
        return binding;
    }

    private SourceEntity officialSource(Long id) {
        SourceEntity source = new SourceEntity();
        source.setId(id);
        source.setClanId(CLAN_ID);
        source.setVerificationStatus("official");
        source.setConfidenceLevel("high");
        return source;
    }

    private RevisionEntity revision(Long id, String type, Long targetId, String status) {
        RevisionEntity revision = new RevisionEntity();
        revision.setId(id);
        revision.setClanId(CLAN_ID);
        revision.setTargetType(type);
        revision.setTargetId(targetId);
        revision.setStatus(status);
        return revision;
    }

    private ReviewTaskEntity reviewTask(Long id, Long revisionId, String status) {
        ReviewTaskEntity task = new ReviewTaskEntity();
        task.setId(id);
        task.setClanId(CLAN_ID);
        task.setRevisionId(revisionId);
        task.setReviewLevel(1);
        task.setStatus(status);
        return task;
    }
}
