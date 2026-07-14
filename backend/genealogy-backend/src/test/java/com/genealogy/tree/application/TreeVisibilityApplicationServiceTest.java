package com.genealogy.tree.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.person.application.PersonApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.mapper.PersonMapper;
import com.genealogy.relationship.application.RelationshipApplicationService;
import com.genealogy.tree.application.TreeVisibilityApplicationService.PersonProjection;
import com.genealogy.tree.application.TreeVisibilityApplicationService.Visibility;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
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
        when(personApplicationService.get(official.getId(), ACTOR_ID))
                .thenReturn(PersonMapper.toResponse(official));

        PersonProjection projection = service.projectPerson(official, ACTOR_ID, "official");

        assertEquals(Visibility.FULL, projection.visibility());
        assertEquals(official.getName(), projection.displayName());
    }

    @Test
    void privatePersonIsMaskedWithoutBranchUpdatePermission() {
        PersonEntity privatePerson = person(3L, 10L, "official", "private", false);
        when(personApplicationService.get(privatePerson.getId(), ACTOR_ID))
                .thenReturn(PersonMapper.toResponse(privatePerson));
        deny(privatePerson, "person:update");

        PersonProjection projection = service.projectPerson(privatePerson, ACTOR_ID, "official");

        assertEquals(Visibility.MASKED, projection.visibility());
        assertEquals("受保护人物", projection.displayName());
        assertEquals("privacy_restricted", projection.maskReason());
    }

    @Test
    void relativesOnlyPersonUsesSameProtectedProjection() {
        PersonEntity relativesOnly = person(4L, 10L, "official", "relatives_only", false);
        when(personApplicationService.get(relativesOnly.getId(), ACTOR_ID))
                .thenReturn(PersonMapper.toResponse(relativesOnly));
        deny(relativesOnly, "person:update");

        PersonProjection projection = service.projectPerson(relativesOnly, ACTOR_ID, "official");

        assertEquals(Visibility.MASKED, projection.visibility());
        assertEquals("受保护人物", projection.displayName());
    }

    @Test
    void sealedPersonIsMaskedWithoutBranchDeletePermission() {
        PersonEntity sealed = person(5L, 10L, "official", "sealed", false);
        when(personApplicationService.get(sealed.getId(), ACTOR_ID))
                .thenReturn(PersonMapper.toResponse(sealed));
        deny(sealed, "person:delete");

        PersonProjection projection = service.projectPerson(sealed, ACTOR_ID, "official");

        assertEquals(Visibility.MASKED, projection.visibility());
        assertEquals("已封存人物", projection.displayName());
    }

    @Test
    void livingPersonIsMaskedForReadOnlyBranchViewer() {
        PersonEntity living = person(6L, 10L, "official", "branch_only", true);
        when(personApplicationService.get(living.getId(), ACTOR_ID))
                .thenReturn(PersonMapper.toResponse(living));
        deny(living, "person:update");

        PersonProjection projection = service.projectPerson(living, ACTOR_ID, "official");

        assertEquals(Visibility.MASKED, projection.visibility());
        assertEquals("在世人物", projection.displayName());
    }

    @Test
    void livingBranchOnlyPersonIsHiddenOutsideAuthorizedBranch() {
        PersonEntity living = person(7L, 20L, "official", null, true);
        deny(living, "person:view");

        PersonProjection projection = service.projectPerson(living, ACTOR_ID, "official");

        assertEquals(Visibility.HIDDEN, projection.visibility());
        verify(personApplicationService, never()).get(anyLong(), anyLong());
    }

    @Test
    void authorizedEditorCanReadDraftRoot() {
        PersonEntity root = person(8L, 10L, "draft", "clan_only", false);
        when(personApplicationService.get(root.getId(), ACTOR_ID))
                .thenReturn(PersonMapper.toResponse(root));

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
    void inaccessibleRootUsesNotFoundSemantics() {
        PersonEntity root = person(10L, 30L, "official", "clan_only", false);
        deny(root, "person:view");

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.requireRootProjection(root, ACTOR_ID, "official")
        );

        assertEquals("PERSON_NOT_FOUND", exception.getCode());
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
        doThrow(new BusinessException("AUTH_FORBIDDEN", "forbidden"))
                .when(authorizationApplicationService)
                .requireBranchPermission(
                        eq(person.getClanId()),
                        eq(ACTOR_ID),
                        eq(person.getBranchId()),
                        eq(permissionCode)
                );
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
}
