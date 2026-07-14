package com.genealogy.tree.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.person.application.PersonApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.mapper.PersonMapper;
import com.genealogy.relationship.application.RelationshipApplicationService;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.tree.application.TreeVisibilityApplicationService.PersonProjection;
import com.genealogy.tree.application.TreeVisibilityApplicationService.Visibility;
import com.genealogy.tree.application.TreeVisibilityApplicationService.VisibilitySession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TreeVisibilityApplicationServiceTest {

    private static final Long ACTOR_ID = 99L;

    @Mock
    private AuthorizationApplicationService authorizationApplicationService;
    @Mock
    private PersonApplicationService personApplicationService;
    @Mock
    private RelationshipApplicationService relationshipApplicationService;
    @InjectMocks
    private TreeVisibilityApplicationService service;

    private final Set<PermissionKey> deniedPermissions = new HashSet<>();

    @BeforeEach
    void configurePermissionDecisions() {
        deniedPermissions.clear();
        lenient().doAnswer(invocation -> {
            PermissionKey key = new PermissionKey(
                    invocation.getArgument(0),
                    invocation.getArgument(2),
                    invocation.getArgument(3)
            );
            if (deniedPermissions.contains(key)) {
                throw new BusinessException("AUTH_FORBIDDEN", "forbidden");
            }
            return null;
        }).when(authorizationApplicationService)
                .requireBranchPermission(anyLong(), anyLong(), anyLong(), anyString());
    }

    @Test
    void officialViewHidesDraftPersonBeforeReadingPrivateFields() {
        PersonEntity draft = person(1L, 10L, "draft", "public", false);
        PersonProjection projection = service.projectPerson(draft, ACTOR_ID, "official");
        assertEquals(Visibility.HIDDEN, projection.visibility());
        verify(personApplicationService, never()).get(anyLong(), anyLong());
    }

    @Test
    void authorizedOfficialPersonIsFullyVisible() {
        PersonEntity official = person(2L, 10L, "official", "public", false);
        when(personApplicationService.get(official.getId(), ACTOR_ID)).thenReturn(PersonMapper.toResponse(official));
        PersonProjection projection = service.projectPerson(official, ACTOR_ID, "official");
        assertEquals(Visibility.FULL, projection.visibility());
        assertEquals(official.getName(), projection.displayName());
    }

    @Test
    void privatePersonIsMaskedWithoutBranchUpdatePermission() {
        PersonEntity value = person(3L, 10L, "official", "private", false);
        when(personApplicationService.get(value.getId(), ACTOR_ID)).thenReturn(PersonMapper.toResponse(value));
        deny(value, "person:update");
        PersonProjection projection = service.projectPerson(value, ACTOR_ID, "official");
        assertEquals(Visibility.MASKED, projection.visibility());
        assertEquals("受保护人物", projection.displayName());
        assertEquals("privacy_restricted", projection.maskReason());
    }

    @Test
    void relativesOnlyPersonUsesSameProtectedProjection() {
        PersonEntity value = person(4L, 10L, "official", "relatives_only", false);
        when(personApplicationService.get(value.getId(), ACTOR_ID)).thenReturn(PersonMapper.toResponse(value));
        deny(value, "person:update");
        PersonProjection projection = service.projectPerson(value, ACTOR_ID, "official");
        assertEquals(Visibility.MASKED, projection.visibility());
        assertEquals("受保护人物", projection.displayName());
    }

    @Test
    void sealedPersonIsMaskedWithoutBranchDeletePermission() {
        PersonEntity value = person(5L, 10L, "official", "sealed", false);
        when(personApplicationService.get(value.getId(), ACTOR_ID)).thenReturn(PersonMapper.toResponse(value));
        deny(value, "person:delete");
        PersonProjection projection = service.projectPerson(value, ACTOR_ID, "official");
        assertEquals(Visibility.MASKED, projection.visibility());
        assertEquals("已封存人物", projection.displayName());
    }

    @Test
    void livingPersonIsMaskedForReadOnlyBranchViewer() {
        PersonEntity value = person(6L, 10L, "official", "branch_only", true);
        when(personApplicationService.get(value.getId(), ACTOR_ID)).thenReturn(PersonMapper.toResponse(value));
        deny(value, "person:update");
        PersonProjection projection = service.projectPerson(value, ACTOR_ID, "official");
        assertEquals(Visibility.MASKED, projection.visibility());
        assertEquals("在世人物", projection.displayName());
    }

    @Test
    void livingBranchOnlyPersonIsHiddenOutsideAuthorizedBranch() {
        PersonEntity value = person(7L, 20L, "official", null, true);
        deny(value, "person:view");
        PersonProjection projection = service.projectPerson(value, ACTOR_ID, "official");
        assertEquals(Visibility.HIDDEN, projection.visibility());
        verify(personApplicationService, never()).get(anyLong(), anyLong());
    }

    @Test
    void authorizedEditorCanReadDraftRoot() {
        PersonEntity root = person(8L, 10L, "draft", "clan_only", false);
        when(personApplicationService.get(root.getId(), ACTOR_ID)).thenReturn(PersonMapper.toResponse(root));
        PersonProjection projection = service.requireRootProjection(root, ACTOR_ID, "editing");
        assertEquals(Visibility.FULL, projection.visibility());
        assertEquals(root.getId(), projection.response().id());
    }

    @Test
    void editingRootRequiresBothPersonAndRelationshipEditPermission() {
        PersonEntity root = person(9L, 10L, "draft", "clan_only", false);
        deny(root, "relationship:update");
        deny(root, "review_task:approve");
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.requireRootProjection(root, ACTOR_ID, "editing")
        );
        assertEquals("AUTH_FORBIDDEN", exception.getCode());
    }

    @Test
    void officialViewHidesDraftRelationshipBeforeCallingExistingPolicy() {
        PersonEntity from = person(10L, 10L, "official", "public", false);
        PersonEntity to = person(11L, 10L, "official", "public", false);
        RelationshipEntity relationship = relationship(100L, from, to, "draft");
        boolean visible = service.canExposeRelationship(
                relationship,
                PersonProjection.full(from, PersonMapper.toResponse(from)),
                PersonProjection.full(to, PersonMapper.toResponse(to)),
                ACTOR_ID,
                "official"
        );
        assertFalse(visible);
        verify(relationshipApplicationService, never()).get(relationship.getId(), ACTOR_ID);
    }

    @Test
    void existingRelationshipPrivacyDenialHidesEdge() {
        PersonEntity from = person(12L, 10L, "official", "public", false);
        PersonEntity to = person(13L, 10L, "official", "public", false);
        RelationshipEntity relationship = relationship(101L, from, to, "official");
        doThrow(new BusinessException("RELATIONSHIP_PRIVACY_FORBIDDEN", "forbidden"))
                .when(relationshipApplicationService).get(relationship.getId(), ACTOR_ID);
        boolean visible = service.canExposeRelationship(
                relationship,
                PersonProjection.full(from, PersonMapper.toResponse(from)),
                PersonProjection.full(to, PersonMapper.toResponse(to)),
                ACTOR_ID,
                "official"
        );
        assertFalse(visible);
    }

    @Test
    void inaccessibleRootUsesNotFoundSemantics() {
        PersonEntity root = person(14L, 30L, "official", "clan_only", false);
        deny(root, "person:view");
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.requireRootProjection(root, ACTOR_ID, "official")
        );
        assertEquals("PERSON_NOT_FOUND", exception.getCode());
    }

    @Test
    void preloadedSessionAvoidsSecondPersonAndRelationshipReads() {
        PersonEntity from = person(15L, 10L, "official", "public", false);
        PersonEntity to = person(16L, 10L, "official", "public", false);
        RelationshipEntity relationship = relationship(102L, from, to, "official");
        VisibilitySession session = service.openSession(ACTOR_ID, "official");
        PersonProjection fromProjection = session.projectPerson(from);
        PersonProjection toProjection = session.projectPerson(to);
        assertTrue(session.canExposeRelationship(relationship, fromProjection, toProjection));
        verify(personApplicationService, never()).get(anyLong(), anyLong());
        verify(relationshipApplicationService, never()).get(anyLong(), anyLong());
    }

    @Test
    void preloadedSessionCachesBranchPermissionDecisions() {
        PersonEntity first = person(17L, 10L, "official", "public", false);
        PersonEntity second = person(18L, 10L, "official", "public", false);
        VisibilitySession session = service.openSession(ACTOR_ID, "official");
        session.projectPerson(first);
        session.projectPerson(second);
        verify(authorizationApplicationService, times(1))
                .requireBranchPermission(1L, ACTOR_ID, 10L, "person:view");
    }

    @Test
    void invalidDataViewIsRejected() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.normalizeDataView("all")
        );
        assertEquals("TREE_DATA_VIEW_INVALID", exception.getCode());
        assertTrue(exception.getMessage().contains("数据视图"));
    }

    private void deny(PersonEntity person, String permissionCode) {
        deniedPermissions.add(new PermissionKey(person.getClanId(), person.getBranchId(), permissionCode));
    }

    private PersonEntity person(Long id, Long branchId, String dataStatus, String privacyLevel, boolean living) {
        PersonEntity person = new PersonEntity();
        person.setId(id);
        person.setClanId(1L);
        person.setBranchId(branchId);
        person.setName("敏感人物" + id);
        person.setGender("male");
        person.setGenerationNo(12);
        person.setGenerationWord("承");
        person.setDataStatus(dataStatus);
        person.setPrivacyLevel(privacyLevel);
        person.setIsLiving(living);
        return person;
    }

    private RelationshipEntity relationship(Long id, PersonEntity from, PersonEntity to, String dataStatus) {
        RelationshipEntity relationship = new RelationshipEntity();
        relationship.setId(id);
        relationship.setClanId(from.getClanId());
        relationship.setFromPersonId(from.getId());
        relationship.setToPersonId(to.getId());
        relationship.setRelationType("parent_child");
        relationship.setRelationCategory("blood");
        relationship.setDataStatus(dataStatus);
        return relationship;
    }

    private record PermissionKey(Long clanId, Long branchId, String permissionCode) {
    }
}
