package com.genealogy.tree.application;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.mapper.PersonMapper;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.tree.application.TreeVisibilityApplicationService.PersonProjection;
import com.genealogy.tree.dto.TreeGraphResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TreeApplicationServiceTest {

    private static final Long ACTOR_ID = 99L;

    @Mock
    private PersonRepository personRepository;

    @Mock
    private RelationshipRepository relationshipRepository;

    @Mock
    private BranchRepository branchRepository;

    @Mock
    private TreeVisibilityApplicationService visibilityApplicationService;

    @InjectMocks
    private TreeApplicationService service;

    @BeforeEach
    void setUpVisibilityDefaults() {
        when(visibilityApplicationService.normalizeDataView(null)).thenReturn("official");
    }

    @Test
    void maskedRootReturnsOnlySafePlaceholderWithoutEdges() {
        PersonEntity root = person(1L, 10L, "根人物");
        when(personRepository.findByIdAndDeletedAtIsNull(root.getId())).thenReturn(Optional.of(root));
        when(visibilityApplicationService.requireRootProjection(root, ACTOR_ID, "official"))
                .thenReturn(PersonProjection.masked(
                        root,
                        PersonMapper.toResponse(root),
                        "privacy_restricted",
                        "受保护人物"
                ));

        TreeGraphResponse response = service.family(root.getId(), null, null, null, null, ACTOR_ID);

        assertNull(response.rootPersonId());
        assertEquals("masked-root", response.rootNodeId());
        assertEquals(1, response.nodes().size());
        assertEquals("受保护人物", response.nodes().get(0).displayName());
        assertNull(response.nodes().get(0).personId());
        assertTrue(response.edges().isEmpty());
        assertEquals("root_filtered", response.warnings().get(0).code());
        verify(relationshipRepository, never()).findByFromPersonIdAndDeletedAtIsNull(root.getId());
    }

    @Test
    void descendantsDropMaskedRelatedPersonAndRelationshipTogether() {
        PersonEntity root = person(1L, 10L, "根人物");
        PersonEntity child = person(2L, 10L, "受保护子女");
        RelationshipEntity relationship = relationship(100L, root.getId(), child.getId());
        allowRoot(root);
        when(personRepository.findByIdAndDeletedAtIsNull(child.getId())).thenReturn(Optional.of(child));
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(root.getId()))
                .thenReturn(List.of(relationship));
        when(visibilityApplicationService.projectPerson(child, ACTOR_ID, "official"))
                .thenReturn(PersonProjection.masked(
                        child,
                        PersonMapper.toResponse(child),
                        "privacy_restricted",
                        "受保护人物"
                ));

        TreeGraphResponse response = service.descendants(
                root.getId(), 1, null, null, null, null, ACTOR_ID
        );

        assertEquals(root.getId(), response.rootPersonId());
        assertEquals(List.of(root.getId()), response.nodes().stream().map(node -> node.personId()).toList());
        assertTrue(response.edges().isEmpty());
        assertEquals("partial_visibility", response.warnings().get(0).code());
    }

    @Test
    void deniedRelationshipDoesNotLeakRelatedNodeOrEdge() {
        PersonEntity root = person(1L, 10L, "根人物");
        PersonEntity child = person(2L, 10L, "子女");
        RelationshipEntity relationship = relationship(101L, root.getId(), child.getId());
        allowRoot(root);
        allowPerson(child);
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(root.getId()))
                .thenReturn(List.of(relationship));
        when(visibilityApplicationService.canExposeRelationship(
                any(), any(), any(), eq(ACTOR_ID), eq("official")
        )).thenReturn(false);

        TreeGraphResponse response = service.descendants(
                root.getId(), 1, null, null, null, null, ACTOR_ID
        );

        assertEquals(1, response.nodes().size());
        assertTrue(response.edges().isEmpty());
        assertEquals("partial_visibility", response.warnings().get(0).code());
    }

    @Test
    void cycleIsReturnedOnceAndTraversalStops() {
        PersonEntity root = person(1L, 10L, "根人物");
        PersonEntity child = person(2L, 10L, "子女");
        RelationshipEntity forward = relationship(201L, root.getId(), child.getId());
        RelationshipEntity back = relationship(202L, child.getId(), root.getId());
        allowRoot(root);
        allowPerson(child);
        allowRelationships();
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(root.getId()))
                .thenReturn(List.of(forward));
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(child.getId()))
                .thenReturn(List.of(back));

        TreeGraphResponse response = service.descendants(
                root.getId(), 5, null, null, null, null, ACTOR_ID
        );

        assertEquals(2, response.nodes().size());
        assertEquals(2, response.edges().size());
        assertTrue(response.meta().cycleDetected());
        assertWarning(response, "cycle_detected");
    }

    @Test
    void diamondGraphKeepsAllDistinctEdgesAndOneNodePerPerson() {
        PersonEntity root = person(1L, 10L, "根人物");
        PersonEntity left = person(2L, 10L, "左支");
        PersonEntity right = person(3L, 10L, "右支");
        PersonEntity child = person(4L, 10L, "共同后代");
        RelationshipEntity rootLeft = relationship(301L, 1L, 2L);
        RelationshipEntity rootRight = relationship(302L, 1L, 3L);
        RelationshipEntity leftChild = relationship(303L, 2L, 4L);
        RelationshipEntity rightChild = relationship(304L, 3L, 4L);
        allowRoot(root);
        allowPerson(left);
        allowPerson(right);
        allowPerson(child);
        allowRelationships();
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(1L))
                .thenReturn(List.of(rootLeft, rootRight));
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(2L))
                .thenReturn(List.of(leftChild));
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(3L))
                .thenReturn(List.of(rightChild));
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(4L))
                .thenReturn(List.of());

        TreeGraphResponse response = service.descendants(1L, 5, null, null, null, null, ACTOR_ID);

        assertEquals(4, response.nodes().size());
        assertEquals(4, response.edges().size());
        assertEquals(1, response.nodes().stream().filter(node -> Long.valueOf(4L).equals(node.personId())).count());
        assertFalse(response.meta().cycleDetected());
    }

    @Test
    void duplicateRelationshipIsReportedAndReturnedOnce() {
        PersonEntity root = person(1L, 10L, "根人物");
        PersonEntity child = person(2L, 10L, "子女");
        RelationshipEntity duplicate = relationship(401L, 1L, 2L);
        allowRoot(root);
        allowPerson(child);
        allowRelationships();
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(1L))
                .thenReturn(List.of(duplicate, duplicate));
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(2L))
                .thenReturn(List.of());

        TreeGraphResponse response = service.descendants(1L, 5, null, null, null, null, ACTOR_ID);

        assertEquals(1, response.edges().size());
        assertEquals(1, response.meta().duplicateEdgeCount());
        assertWarning(response, "duplicate_edge");
    }

    @Test
    void depthLimitIsReportedOnlyWhenVisibleNextLevelExists() {
        PersonEntity root = person(1L, 10L, "根人物");
        PersonEntity child = person(2L, 10L, "子女");
        PersonEntity grandchild = person(3L, 10L, "孙辈");
        RelationshipEntity first = relationship(501L, 1L, 2L);
        RelationshipEntity second = relationship(502L, 2L, 3L);
        allowRoot(root);
        allowPerson(child);
        allowPerson(grandchild);
        allowRelationships();
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(1L)).thenReturn(List.of(first));
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(2L)).thenReturn(List.of(second));

        TreeGraphResponse response = service.descendants(1L, 1, null, null, null, null, ACTOR_ID);

        assertEquals(List.of(1L, 2L), response.nodes().stream().map(node -> node.personId()).toList());
        assertTrue(response.meta().truncated());
        assertTrue(response.meta().truncationReasons().contains("max_depth"));
        assertWarning(response, "depth_limit_reached");
    }

    @Test
    void nodeLimitStopsExpansionAfterSafeProjection() {
        PersonEntity root = person(1L, 10L, "根人物");
        PersonEntity firstChild = person(2L, 10L, "子女一");
        PersonEntity secondChild = person(3L, 10L, "子女二");
        allowRoot(root);
        allowPerson(firstChild);
        allowPerson(secondChild);
        allowRelationships();
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(1L)).thenReturn(List.of(
                relationship(601L, 1L, 2L),
                relationship(602L, 1L, 3L)
        ));
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(2L)).thenReturn(List.of());

        TreeGraphResponse response = service.descendants(1L, 5, null, null, 2, 10, ACTOR_ID);

        assertEquals(2, response.meta().nodeCount());
        assertTrue(response.meta().truncationReasons().contains("max_nodes"));
        assertWarning(response, "node_limit_reached");
    }

    @Test
    void edgeLimitStopsExpansionAndReturnsTruncationMetadata() {
        PersonEntity root = person(1L, 10L, "根人物");
        PersonEntity firstChild = person(2L, 10L, "子女一");
        PersonEntity secondChild = person(3L, 10L, "子女二");
        allowRoot(root);
        allowPerson(firstChild);
        allowPerson(secondChild);
        allowRelationships();
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(1L)).thenReturn(List.of(
                relationship(701L, 1L, 2L),
                relationship(702L, 1L, 3L)
        ));
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(2L)).thenReturn(List.of());

        TreeGraphResponse response = service.descendants(1L, 5, null, null, 10, 1, ACTOR_ID);

        assertEquals(1, response.meta().edgeCount());
        assertTrue(response.meta().truncationReasons().contains("max_edges"));
        assertWarning(response, "edge_limit_reached");
    }

    @Test
    void branchLineageAppliesVisibilityDedupCycleAndIsolatedWarnings() {
        BranchEntity rootBranch = branch(10L, "/10", 1L);
        PersonEntity root = person(1L, rootBranch.getId(), "根人物");
        PersonEntity child = person(2L, rootBranch.getId(), "子女");
        PersonEntity isolated = person(3L, rootBranch.getId(), "孤立人物");
        RelationshipEntity forward = relationship(801L, 1L, 2L);
        RelationshipEntity back = relationship(802L, 2L, 1L);
        when(branchRepository.findByIdAndClanId(rootBranch.getId(), 1L)).thenReturn(Optional.of(rootBranch));
        when(personRepository.findByClanIdAndDeletedAtIsNull(1L)).thenReturn(List.of(root, child, isolated));
        when(relationshipRepository.findByClanIdAndDeletedAtIsNull(1L))
                .thenReturn(List.of(forward, back, forward));
        when(visibilityApplicationService.projectPerson(any(PersonEntity.class), eq(ACTOR_ID), eq("official")))
                .thenAnswer(invocation -> {
                    PersonEntity value = invocation.getArgument(0);
                    return PersonProjection.full(value, PersonMapper.toResponse(value));
                });
        allowRelationships();

        TreeGraphResponse response = service.branchLineage(
                1L, rootBranch.getId(), false, null, null, 5, 10, 10, ACTOR_ID
        );

        assertEquals(3, response.nodes().size());
        assertEquals(2, response.edges().size());
        assertTrue(response.meta().cycleDetected());
        assertEquals(1, response.meta().duplicateEdgeCount());
        assertWarning(response, "cycle_detected");
        assertWarning(response, "duplicate_edge");
        assertWarning(response, "isolated_nodes");
    }

    private void allowRoot(PersonEntity root) {
        when(personRepository.findByIdAndDeletedAtIsNull(root.getId())).thenReturn(Optional.of(root));
        when(visibilityApplicationService.requireRootProjection(root, ACTOR_ID, "official"))
                .thenReturn(PersonProjection.full(root, PersonMapper.toResponse(root)));
    }

    private void allowPerson(PersonEntity person) {
        when(personRepository.findByIdAndDeletedAtIsNull(person.getId())).thenReturn(Optional.of(person));
        when(visibilityApplicationService.projectPerson(person, ACTOR_ID, "official"))
                .thenReturn(PersonProjection.full(person, PersonMapper.toResponse(person)));
    }

    private void allowRelationships() {
        when(visibilityApplicationService.canExposeRelationship(
                any(), any(), any(), eq(ACTOR_ID), eq("official")
        )).thenReturn(true);
    }

    private void assertWarning(TreeGraphResponse response, String code) {
        assertTrue(response.warnings().stream().anyMatch(warning -> code.equals(warning.code())));
    }

    private PersonEntity person(Long id, Long branchId, String name) {
        PersonEntity person = new PersonEntity();
        person.setId(id);
        person.setClanId(1L);
        person.setBranchId(branchId);
        person.setName(name);
        person.setGender("male");
        person.setGenerationNo(10);
        person.setGenerationWord("承");
        person.setPrivacyLevel("clan_only");
        person.setDataStatus("official");
        return person;
    }

    private RelationshipEntity relationship(Long id, Long fromPersonId, Long toPersonId) {
        RelationshipEntity relationship = new RelationshipEntity();
        relationship.setId(id);
        relationship.setClanId(1L);
        relationship.setFromPersonId(fromPersonId);
        relationship.setToPersonId(toPersonId);
        relationship.setRelationType("parent_child");
        relationship.setRelationCategory("blood");
        relationship.setIsLineageRelation(true);
        relationship.setDataStatus("official");
        return relationship;
    }

    private BranchEntity branch(Long id, String path, Long founderPersonId) {
        BranchEntity branch = new BranchEntity();
        branch.setId(id);
        branch.setClanId(1L);
        branch.setBranchName("支派" + id);
        branch.setBranchPath(path);
        branch.setFounderPersonId(founderPersonId);
        return branch;
    }
}
