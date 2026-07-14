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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
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

    @Test
    void maskedRootReturnsOnlySafePlaceholderWithoutEdges() {
        PersonEntity root = person(1L, 10L, "根人物");
        when(personRepository.findByIdAndDeletedAtIsNull(root.getId())).thenReturn(Optional.of(root));
        when(visibilityApplicationService.normalizeDataView(null)).thenReturn("official");
        when(visibilityApplicationService.requireRootProjection(root, ACTOR_ID, "official"))
                .thenReturn(PersonProjection.masked(
                        root,
                        PersonMapper.toResponse(root),
                        "privacy_restricted",
                        "受保护人物"
                ));

        TreeGraphResponse response = service.family(root.getId(), null, null, ACTOR_ID);

        assertNull(response.rootPersonId());
        assertEquals(1, response.nodes().size());
        assertEquals("受保护人物", response.nodes().get(0).name());
        assertNull(response.nodes().get(0).personId());
        assertNull(response.nodes().get(0).gender());
        assertNull(response.nodes().get(0).generationNo());
        assertNull(response.nodes().get(0).generationWord());
        assertNull(response.nodes().get(0).branchId());
        assertTrue(response.edges().isEmpty());
        verify(relationshipRepository, never()).findByFromPersonIdAndDeletedAtIsNull(root.getId());
    }

    @Test
    void descendantsDropMaskedRelatedPersonAndRelationshipTogether() {
        PersonEntity root = person(1L, 10L, "根人物");
        PersonEntity child = person(2L, 10L, "受保护子女");
        RelationshipEntity relationship = relationship(100L, root.getId(), child.getId());
        when(personRepository.findByIdAndDeletedAtIsNull(root.getId())).thenReturn(Optional.of(root));
        when(personRepository.findByIdAndDeletedAtIsNull(child.getId())).thenReturn(Optional.of(child));
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(root.getId()))
                .thenReturn(List.of(relationship));
        when(visibilityApplicationService.normalizeDataView(null)).thenReturn("official");
        when(visibilityApplicationService.requireRootProjection(root, ACTOR_ID, "official"))
                .thenReturn(PersonProjection.full(root, PersonMapper.toResponse(root)));
        when(visibilityApplicationService.projectPerson(child, ACTOR_ID, "official"))
                .thenReturn(PersonProjection.masked(
                        child,
                        PersonMapper.toResponse(child),
                        "privacy_restricted",
                        "受保护人物"
                ));

        TreeGraphResponse response = service.descendants(root.getId(), 1, null, null, ACTOR_ID);

        assertEquals(root.getId(), response.rootPersonId());
        assertEquals(List.of(root.getId()), response.nodes().stream().map(node -> node.personId()).toList());
        assertTrue(response.edges().isEmpty());
        verify(visibilityApplicationService, never()).canExposeRelationship(
                relationship,
                PersonProjection.full(root, PersonMapper.toResponse(root)),
                PersonProjection.masked(child, PersonMapper.toResponse(child), "privacy_restricted", "受保护人物"),
                ACTOR_ID,
                "official"
        );
    }

    @Test
    void deniedRelationshipDoesNotLeakRelatedNodeOrEdge() {
        PersonEntity root = person(1L, 10L, "根人物");
        PersonEntity child = person(2L, 10L, "子女");
        RelationshipEntity relationship = relationship(101L, root.getId(), child.getId());
        PersonProjection rootProjection = PersonProjection.full(root, PersonMapper.toResponse(root));
        PersonProjection childProjection = PersonProjection.full(child, PersonMapper.toResponse(child));
        when(personRepository.findByIdAndDeletedAtIsNull(root.getId())).thenReturn(Optional.of(root));
        when(personRepository.findByIdAndDeletedAtIsNull(child.getId())).thenReturn(Optional.of(child));
        when(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(root.getId()))
                .thenReturn(List.of(relationship));
        when(visibilityApplicationService.normalizeDataView(null)).thenReturn("official");
        when(visibilityApplicationService.requireRootProjection(root, ACTOR_ID, "official"))
                .thenReturn(rootProjection);
        when(visibilityApplicationService.projectPerson(child, ACTOR_ID, "official"))
                .thenReturn(childProjection);
        when(visibilityApplicationService.canExposeRelationship(
                relationship, rootProjection, childProjection, ACTOR_ID, "official"
        )).thenReturn(false);

        TreeGraphResponse response = service.descendants(root.getId(), 1, null, null, ACTOR_ID);

        assertEquals(1, response.nodes().size());
        assertEquals(root.getId(), response.nodes().get(0).personId());
        assertTrue(response.edges().isEmpty());
    }

    @Test
    void branchLineageCountsOnlyFullyVisiblePeopleAndEdges() {
        BranchEntity rootBranch = branch(10L, "/10", 1L);
        BranchEntity childBranch = branch(11L, "/10/11", null);
        PersonEntity visible = person(1L, rootBranch.getId(), "可见人物");
        PersonEntity hidden = person(2L, childBranch.getId(), "跨支派人物");
        RelationshipEntity relationship = relationship(102L, visible.getId(), hidden.getId());
        when(branchRepository.findByIdAndClanId(rootBranch.getId(), 1L)).thenReturn(Optional.of(rootBranch));
        when(branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(1L))
                .thenReturn(List.of(rootBranch, childBranch));
        when(personRepository.findByClanIdAndDeletedAtIsNull(1L)).thenReturn(List.of(visible, hidden));
        when(relationshipRepository.findByClanIdAndDeletedAtIsNull(1L)).thenReturn(List.of(relationship));
        when(visibilityApplicationService.normalizeDataView(null)).thenReturn("official");
        when(visibilityApplicationService.projectPerson(visible, ACTOR_ID, "official"))
                .thenReturn(PersonProjection.full(visible, PersonMapper.toResponse(visible)));
        when(visibilityApplicationService.projectPerson(hidden, ACTOR_ID, "official"))
                .thenReturn(PersonProjection.hidden(hidden));

        TreeGraphResponse response = service.branchLineage(
                1L, rootBranch.getId(), true, null, null, ACTOR_ID
        );

        assertEquals(visible.getId(), response.rootPersonId());
        assertEquals(List.of(visible.getId()), response.nodes().stream().map(node -> node.personId()).toList());
        assertTrue(response.edges().isEmpty());
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
