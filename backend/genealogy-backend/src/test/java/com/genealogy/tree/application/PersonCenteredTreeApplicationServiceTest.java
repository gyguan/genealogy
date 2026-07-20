package com.genealogy.tree.application;

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
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PersonCenteredTreeApplicationServiceTest {

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
    private PersonCenteredTreeApplicationService service;

    @BeforeEach
    void setUpVisibility() {
        lenient().when(visibilityApplicationService.openSession(ACTOR_ID, null)).thenReturn(visibilitySession);
        lenient().when(visibilitySession.dataView()).thenReturn("official");
        lenient().when(visibilitySession.visibleDataStatuses()).thenReturn(OFFICIAL);
        lenient().when(visibilitySession.canExposeRelationship(any(), any(), any())).thenReturn(true);
    }

    @Test
    void bothQueryAddsSiblingThroughVisibleDirectParent() {
        PersonEntity center = person(2L, "中心人物", 2);
        PersonEntity father = person(1L, "父亲", 1);
        PersonEntity sibling = person(3L, "兄弟姐妹", 2);
        RelationshipEntity fatherToCenter = relationship(101L, father.getId(), center.getId());
        RelationshipEntity fatherToSibling = relationship(102L, father.getId(), sibling.getId());
        allowRoot(center);
        allowRoot(father);
        allowPeople(center, father, sibling);

        when(relationshipRepository.findTreeOutgoing(1L, Set.of(center.getId()), OFFICIAL, DEFAULT_SCOPES, false))
                .thenReturn(List.of());
        when(relationshipRepository.findTreeIncoming(1L, Set.of(center.getId()), OFFICIAL, DEFAULT_SCOPES, false))
                .thenReturn(List.of());
        when(relationshipRepository.findTreeIncoming(1L, Set.of(center.getId()), OFFICIAL, DEFAULT_SCOPES, true))
                .thenReturn(List.of(fatherToCenter));
        when(personRepository.findTreePeopleByIds(1L, Set.of(father.getId()), OFFICIAL))
                .thenReturn(List.of(father));
        when(relationshipRepository.findTreeIncoming(1L, Set.of(father.getId()), OFFICIAL, DEFAULT_SCOPES, true))
                .thenReturn(List.of());
        when(relationshipRepository.findTreeOutgoing(1L, Set.of(center.getId()), OFFICIAL, DEFAULT_SCOPES, true))
                .thenReturn(List.of());

        when(relationshipRepository.findTreeOutgoing(1L, Set.of(father.getId()), OFFICIAL, DEFAULT_SCOPES, false))
                .thenReturn(List.of(fatherToCenter, fatherToSibling));
        when(personRepository.findTreePeopleByIds(1L, Set.of(center.getId(), sibling.getId()), OFFICIAL))
                .thenReturn(List.of(center, sibling));
        when(relationshipRepository.findTreeIncoming(1L, Set.of(father.getId()), OFFICIAL, DEFAULT_SCOPES, false))
                .thenReturn(List.of());

        TreeGraphResponse response = service.personLineage(
                center.getId(), "both", null, null, 1, 50, 50, ACTOR_ID
        );

        assertEquals(center.getId(), response.rootPersonId());
        assertTrue(response.nodes().stream().anyMatch(node -> sibling.getId().equals(node.personId())));
        assertTrue(response.edges().stream().anyMatch(edge -> fatherToSibling.getId().equals(edge.relationshipId())));
        assertEquals(3, response.meta().nodeCount());
        assertEquals(2, response.meta().edgeCount());
        verify(relationshipRepository).findTreeOutgoing(
                1L, Set.of(father.getId()), OFFICIAL, DEFAULT_SCOPES, false
        );
    }

    @Test
    void familyCompatibilityEntryAlsoAddsSibling() {
        PersonEntity center = person(2L, "中心人物", 2);
        PersonEntity mother = person(1L, "母亲", 1);
        PersonEntity sibling = person(4L, "姐妹", 2);
        RelationshipEntity motherToCenter = relationship(201L, mother.getId(), center.getId());
        RelationshipEntity motherToSibling = relationship(202L, mother.getId(), sibling.getId());
        allowRoot(center);
        allowRoot(mother);
        allowPeople(center, mother, sibling);

        when(relationshipRepository.findTreeOutgoing(1L, Set.of(center.getId()), OFFICIAL, DEFAULT_SCOPES, false))
                .thenReturn(List.of());
        when(relationshipRepository.findTreeIncoming(1L, Set.of(center.getId()), OFFICIAL, DEFAULT_SCOPES, false))
                .thenReturn(List.of(motherToCenter));
        when(personRepository.findTreePeopleByIds(1L, Set.of(mother.getId()), OFFICIAL))
                .thenReturn(List.of(mother));

        when(relationshipRepository.findTreeOutgoing(1L, Set.of(mother.getId()), OFFICIAL, DEFAULT_SCOPES, false))
                .thenReturn(List.of(motherToCenter, motherToSibling));
        when(personRepository.findTreePeopleByIds(1L, Set.of(center.getId(), sibling.getId()), OFFICIAL))
                .thenReturn(List.of(center, sibling));
        when(relationshipRepository.findTreeIncoming(1L, Set.of(mother.getId()), OFFICIAL, DEFAULT_SCOPES, false))
                .thenReturn(List.of());

        TreeGraphResponse response = service.family(
                center.getId(), null, null, 50, 50, ACTOR_ID
        );

        assertEquals("family", response.direction());
        assertTrue(response.nodes().stream().anyMatch(node -> sibling.getId().equals(node.personId())));
        assertTrue(response.edges().stream().anyMatch(edge -> motherToSibling.getId().equals(edge.relationshipId())));
    }

    private void allowRoot(PersonEntity person) {
        when(personRepository.findByIdAndDeletedAtIsNull(person.getId())).thenReturn(Optional.of(person));
        when(visibilitySession.requireRootProjection(person)).thenReturn(full(person));
    }

    private void allowPeople(PersonEntity... people) {
        for (PersonEntity person : people) {
            lenient().when(visibilitySession.projectPerson(person)).thenReturn(full(person));
        }
    }

    private PersonProjection full(PersonEntity person) {
        return PersonProjection.full(person, PersonMapper.toResponse(person));
    }

    private PersonEntity person(Long id, String name, int generationNo) {
        PersonEntity person = new PersonEntity();
        person.setId(id);
        person.setClanId(1L);
        person.setBranchId(10L);
        person.setName(name);
        person.setGender(id % 2 == 0 ? "male" : "female");
        person.setGenerationNo(generationNo);
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
}
