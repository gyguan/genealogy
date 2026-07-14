package com.genealogy.tree.application;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.mapper.PersonMapper;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.tree.application.TreeVisibilityApplicationService.PersonProjection;
import com.genealogy.tree.application.TreeVisibilityApplicationService.VisibilitySession;
import com.genealogy.tree.dto.TreeGraphResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TreeApplicationServiceTest {

    private static final Long ACTOR_ID = 99L;
    private static final Set<String> OFFICIAL = Set.of("official");
    private static final Set<String> DEFAULT_SCOPES = Set.of("blood", "ritual", "marriage");

    @Mock
    private PersonRepository personRepository;

    @Mock
    private RelationshipRepository relationshipRepository;

    @Mock
    private BranchRepository branchRepository;

    @Mock
    private TreeVisibilityApplicationService visibilityApplicationService;

    @Mock
    private VisibilitySession visibilitySession;

    @InjectMocks
    private TreeApplicationService service;

    @BeforeEach
    void setUpVisibilitySession() {
        lenient().when(visibilityApplicationService.openSession(ACTOR_ID, null)).thenReturn(visibilitySession);
        lenient().when(visibilitySession.dataView()).thenReturn("official");
        lenient().when(visibilitySession.visibleDataStatuses()).thenReturn(OFFICIAL);
        lenient().when(visibilitySession.canExposeRelationship(any(), any(), any())).thenReturn(true);
    }

    @Test
    void maskedRootReturnsOnlySafePlaceholderWithoutQueryingRelationships() {
        PersonEntity root = person(1L, 10L, "根人物");
        when(personRepository.findByIdAndDeletedAtIsNull(root.getId())).thenReturn(Optional.of(root));
        when(visibilitySession.requireRootProjection(root)).thenReturn(PersonProjection.masked(
                root, PersonMapper.toResponse(root), "privacy_restricted", "受保护人物"
        ));

        TreeGraphResponse response = service.family(root.getId(), null, null, null, null, ACTOR_ID);

        assertNull(response.rootPersonId());
        assertEquals("masked-root", response.rootNodeId());
        assertEquals(1, response.nodes().size());
        assertTrue(response.edges().isEmpty());
        assertWarning(response, "root_filtered");
        verify(relationshipRepository, never()).findTreeOutgoing(
                anyLong(), anyCollection(), anyCollection(), anyCollection(), anyBoolean()
        );
    }

    @Test
    void wideLayerUsesOneRelationshipQueryAndOnePersonBatchQuery() {
        PersonEntity root = person(1L, 10L, "根人物");
        PersonEntity childA = person(2L, 10L, "子女一");
        PersonEntity childB = person(3L, 10L, "子女二");
        allowRoot(root);
        allowPeople(childA, childB);
        when(relationshipRepository.findTreeOutgoing(
                1L, Set.of(1L), OFFICIAL, DEFAULT_SCOPES, true
        )).thenReturn(List.of(
                relationship(101L, 1L, 2L),
                relationship(102L, 1L, 3L)
        ));
        when(personRepository.findTreePeopleByIds(1L, Set.of(2L, 3L), OFFICIAL))
                .thenReturn(List.of(childA, childB));
        when(relationshipRepository.findTreeOutgoing(
                1L, Set.of(2L, 3L), OFFICIAL, DEFAULT_SCOPES, true
        )).thenReturn(List.of());

        TreeGraphResponse response = service.descendants(
                root.getId(), 2, null, null, 50, 50, ACTOR_ID
        );

        assertEquals(3, response.nodes().size());
        assertEquals(2, response.edges().size());
        verify(relationshipRepository, times(2)).findTreeOutgoing(
                eq(1L), anyCollection(), eq(OFFICIAL), eq(DEFAULT_SCOPES), eq(true)
        );
        verify(personRepository, times(1)).findTreePeopleByIds(
                eq(1L), anyCollection(), eq(OFFICIAL)
        );
        verify(personRepository, never()).findByIdAndDeletedAtIsNull(2L);
        verify(personRepository, never()).findByIdAndDeletedAtIsNull(3L);
        verify(relationshipRepository, never()).findByFromPersonIdAndDeletedAtIsNull(anyLong());
    }

    @Test
    void deepChainQueryCountGrowsByDepthNotByVisitedNodeCount() {
        PersonEntity root = person(1L, 10L, "一世");
        PersonEntity second = person(2L, 10L, "二世");
        PersonEntity third = person(3L, 10L, "三世");
        PersonEntity fourth = person(4L, 10L, "四世");
        allowRoot(root);
        allowPeople(second, third, fourth);
        when(relationshipRepository.findTreeOutgoing(1L, Set.of(1L), OFFICIAL, DEFAULT_SCOPES, true))
                .thenReturn(List.of(relationship(201L, 1L, 2L)));
        when(relationshipRepository.findTreeOutgoing(1L, Set.of(2L), OFFICIAL, DEFAULT_SCOPES, true))
                .thenReturn(List.of(relationship(202L, 2L, 3L)));
        when(relationshipRepository.findTreeOutgoing(1L, Set.of(3L), OFFICIAL, DEFAULT_SCOPES, true))
                .thenReturn(List.of(relationship(203L, 3L, 4L)));
        when(personRepository.findTreePeopleByIds(1L, Set.of(2L), OFFICIAL)).thenReturn(List.of(second));
        when(personRepository.findTreePeopleByIds(1L, Set.of(3L), OFFICIAL)).thenReturn(List.of(third));
        when(personRepository.findTreePeopleByIds(1L, Set.of(4L), OFFICIAL)).thenReturn(List.of(fourth));

        TreeGraphResponse response = service.descendants(1L, 3, null, null, 50, 50, ACTOR_ID);

        assertEquals(4, response.nodes().size());
        assertEquals(3, response.edges().size());
        verify(relationshipRepository, times(3)).findTreeOutgoing(
                eq(1L), anyCollection(), eq(OFFICIAL), eq(DEFAULT_SCOPES), eq(true)
        );
        verify(personRepository, times(3)).findTreePeopleByIds(
                eq(1L), anyCollection(), eq(OFFICIAL)
        );
    }

    @Test
    void diamondGraphKeepsDistinctEdgesWhileBatchingSharedChild() {
        PersonEntity root = person(1L, 10L, "根人物");
        PersonEntity left = person(2L, 10L, "左支");
        PersonEntity right = person(3L, 10L, "右支");
        PersonEntity child = person(4L, 10L, "共同后代");
        allowRoot(root);
        allowPeople(left, right, child);
        when(relationshipRepository.findTreeOutgoing(1L, Set.of(1L), OFFICIAL, DEFAULT_SCOPES, true))
                .thenReturn(List.of(relationship(301L, 1L, 2L), relationship(302L, 1L, 3L)));
        when(personRepository.findTreePeopleByIds(1L, Set.of(2L, 3L), OFFICIAL))
                .thenReturn(List.of(left, right));
        when(relationshipRepository.findTreeOutgoing(1L, Set.of(2L, 3L), OFFICIAL, DEFAULT_SCOPES, true))
                .thenReturn(List.of(relationship(303L, 2L, 4L), relationship(304L, 3L, 4L)));
        when(personRepository.findTreePeopleByIds(1L, Set.of(4L), OFFICIAL)).thenReturn(List.of(child));
        when(relationshipRepository.findTreeOutgoing(1L, Set.of(4L), OFFICIAL, DEFAULT_SCOPES, true))
                .thenReturn(List.of());

        TreeGraphResponse response = service.descendants(1L, 3, null, null, 50, 50, ACTOR_ID);

        assertEquals(4, response.nodes().size());
        assertEquals(4, response.edges().size());
        assertEquals(1, response.nodes().stream().filter(node -> Long.valueOf(4L).equals(node.personId())).count());
        assertFalse(response.meta().cycleDetected());
    }

    @Test
    void cycleAndDuplicateEdgeRemainProtectedAfterBatching() {
        PersonEntity root = person(1L, 10L, "根人物");
        PersonEntity child = person(2L, 10L, "子女");
        RelationshipEntity forward = relationship(401L, 1L, 2L);
        RelationshipEntity back = relationship(402L, 2L, 1L);
        allowRoot(root);
        allowPeople(child);
        when(relationshipRepository.findTreeOutgoing(1L, Set.of(1L), OFFICIAL, DEFAULT_SCOPES, true))
                .thenReturn(List.of(forward, forward));
        when(personRepository.findTreePeopleByIds(1L, Set.of(2L), OFFICIAL)).thenReturn(List.of(child));
        when(relationshipRepository.findTreeOutgoing(1L, Set.of(2L), OFFICIAL, DEFAULT_SCOPES, true))
                .thenReturn(List.of(back));

        TreeGraphResponse response = service.descendants(1L, 5, null, null, 50, 50, ACTOR_ID);

        assertEquals(2, response.nodes().size());
        assertEquals(2, response.edges().size());
        assertTrue(response.meta().cycleDetected());
        assertEquals(1, response.meta().duplicateEdgeCount());
        assertWarning(response, "cycle_detected");
        assertWarning(response, "duplicate_edge");
    }

    @Test
    void nodeAndEdgeLimitsStillBoundBatchResults() {
        PersonEntity root = person(1L, 10L, "根人物");
        PersonEntity childA = person(2L, 10L, "子女一");
        PersonEntity childB = person(3L, 10L, "子女二");
        allowRoot(root);
        allowPeople(childA, childB);
        when(relationshipRepository.findTreeOutgoing(1L, Set.of(1L), OFFICIAL, DEFAULT_SCOPES, true))
                .thenReturn(List.of(relationship(501L, 1L, 2L), relationship(502L, 1L, 3L)));
        when(personRepository.findTreePeopleByIds(1L, Set.of(2L, 3L), OFFICIAL))
                .thenReturn(List.of(childA, childB));

        TreeGraphResponse nodeLimited = service.descendants(1L, 5, null, null, 2, 10, ACTOR_ID);
        assertEquals(2, nodeLimited.meta().nodeCount());
        assertTrue(nodeLimited.meta().truncationReasons().contains("max_nodes"));

        TreeGraphResponse edgeLimited = service.descendants(1L, 5, null, null, 10, 1, ACTOR_ID);
        assertEquals(1, edgeLimited.meta().edgeCount());
        assertTrue(edgeLimited.meta().truncationReasons().contains("max_edges"));
    }

    @Test
    void branchLineageUsesSubtreeAndScopedDatabaseQueriesOnly() {
        BranchEntity rootBranch = branch(10L, "/10", 1L);
        PersonEntity root = person(1L, 10L, "根人物");
        PersonEntity child = person(2L, 11L, "子女");
        when(branchRepository.findByIdAndClanId(10L, 1L)).thenReturn(Optional.of(rootBranch));
        when(branchRepository.findSubtreeIds(1L, List.of(10L))).thenReturn(List.of(10L, 11L));
        when(personRepository.findTreePeopleByBranches(
                eq(1L), eq(Set.of(10L, 11L)), eq(OFFICIAL), any(Pageable.class)
        )).thenReturn(List.of(root, child));
        when(visibilitySession.projectPerson(root)).thenReturn(full(root));
        when(visibilitySession.projectPerson(child)).thenReturn(full(child));
        when(relationshipRepository.findTreeWithinPeople(
                eq(1L), eq(Set.of(1L, 2L)), eq(OFFICIAL), eq(DEFAULT_SCOPES), any(Pageable.class)
        )).thenReturn(List.of(relationship(601L, 1L, 2L)));

        TreeGraphResponse response = service.branchLineage(
                1L, 10L, true, null, null, 5, 100, 100, ACTOR_ID
        );

        assertEquals(2, response.nodes().size());
        assertEquals(1, response.edges().size());
        verify(personRepository, never()).findByClanIdAndDeletedAtIsNull(anyLong());
        verify(relationshipRepository, never()).findByClanIdAndDeletedAtIsNull(anyLong());
        verify(branchRepository, never()).findByClanIdOrderByLevelAscSortOrderAscIdAsc(anyLong());
    }

    @Test
    void databaseQueriesReceiveEditingStatusesAndRequestedRelationScopes() {
        PersonEntity root = person(1L, 10L, "根人物");
        when(visibilityApplicationService.openSession(ACTOR_ID, "editing")).thenReturn(visibilitySession);
        when(visibilitySession.dataView()).thenReturn("editing");
        when(visibilitySession.visibleDataStatuses()).thenReturn(Set.of(
                "draft", "pending_review", "official", "rejected"
        ));
        when(personRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(root));
        when(visibilitySession.requireRootProjection(root)).thenReturn(full(root));
        when(relationshipRepository.findTreeOutgoing(
                eq(1L), eq(Set.of(1L)), anyCollection(), eq(Set.of("ritual")), eq(true)
        )).thenReturn(List.of());

        service.descendants(1L, 1, List.of("ritual"), "editing", 20, 20, ACTOR_ID);

        ArgumentCaptor<Collection<String>> statuses = ArgumentCaptor.forClass(Collection.class);
        verify(relationshipRepository).findTreeOutgoing(
                eq(1L), eq(Set.of(1L)), statuses.capture(), eq(Set.of("ritual")), eq(true)
        );
        assertEquals(Set.of("draft", "pending_review", "official", "rejected"), Set.copyOf(statuses.getValue()));
    }

    private void allowRoot(PersonEntity root) {
        when(personRepository.findByIdAndDeletedAtIsNull(root.getId())).thenReturn(Optional.of(root));
        when(visibilitySession.requireRootProjection(root)).thenReturn(full(root));
    }

    private void allowPeople(PersonEntity... people) {
        for (PersonEntity person : people) {
            lenient().when(visibilitySession.projectPerson(person)).thenReturn(full(person));
        }
    }

    private PersonProjection full(PersonEntity person) {
        return PersonProjection.full(person, PersonMapper.toResponse(person));
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
