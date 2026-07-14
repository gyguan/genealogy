package com.genealogy.culture.domain;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CulturePermissionPolicyServiceTest {

    @Mock private AuthorizationApplicationService authorizationApplicationService;
    @Mock private RbacAuthorizationApplicationService rbacAuthorizationApplicationService;

    private CulturePermissionPolicyService service;

    @BeforeEach
    void setUp() {
        service = new CulturePermissionPolicyService(
                authorizationApplicationService,
                rbacAuthorizationApplicationService
        );
    }

    @Test
    void sealedItemUsesNotFoundSemanticsWithoutSensitivePermission() {
        CultureItemEntity item = item("sealed", "normal", "official");
        when(authorizationApplicationService.isCrossClanAdmin(7L)).thenReturn(false);
        when(rbacAuthorizationApplicationService.hasPermission(
                7L, 1L, CulturePermissionPolicyService.VIEW,
                MemberRoleScopeType.branch, 10L)).thenReturn(true);
        when(rbacAuthorizationApplicationService.hasPermission(
                7L, 1L, CulturePermissionPolicyService.VIEW_SENSITIVE,
                MemberRoleScopeType.branch, 10L)).thenReturn(false);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.requireVisible(item, 7L)
        );

        assertEquals("CULTURE_ITEM_NOT_FOUND", exception.getCode());
    }

    @Test
    void sensitiveReviewerCanSeeSealedItemAndReviewWithinBranchScope() {
        CultureItemEntity item = item("sealed", "highly_sensitive", "official");
        when(authorizationApplicationService.isCrossClanAdmin(8L)).thenReturn(false);
        when(rbacAuthorizationApplicationService.hasPermission(
                8L, 1L, CulturePermissionPolicyService.VIEW,
                MemberRoleScopeType.branch, 10L)).thenReturn(true);
        when(rbacAuthorizationApplicationService.hasPermission(
                8L, 1L, CulturePermissionPolicyService.VIEW_SENSITIVE,
                MemberRoleScopeType.branch, 10L)).thenReturn(true);
        when(rbacAuthorizationApplicationService.hasPermission(
                8L, 1L, CulturePermissionPolicyService.REVIEW,
                MemberRoleScopeType.branch, 10L)).thenReturn(true);

        assertDoesNotThrow(() -> service.requireAction(item, 8L, CulturePermissionPolicyService.REVIEW));
        assertTrue(service.allowedActions(item, 8L, false).contains("view_sensitive"));
    }

    @Test
    void pendingRevisionRemovesOfficialMutationActions() {
        CultureItemEntity item = item("clan_only", "normal", "official");
        when(authorizationApplicationService.isCrossClanAdmin(7L)).thenReturn(false);
        when(rbacAuthorizationApplicationService.hasPermission(
                7L, 1L, CulturePermissionPolicyService.VIEW,
                MemberRoleScopeType.branch, 10L)).thenReturn(true);
        when(rbacAuthorizationApplicationService.hasPermission(
                7L, 1L, CulturePermissionPolicyService.VIEW_SENSITIVE,
                MemberRoleScopeType.branch, 10L)).thenReturn(false);

        List<String> actions = service.allowedActions(item, 7L, true);

        assertEquals(List.of("view"), actions);
        assertFalse(actions.contains("request_update"));
    }

    private CultureItemEntity item(String privacy, String sensitive, String status) {
        CultureItemEntity item = new CultureItemEntity();
        item.setId(100L);
        item.setClanId(1L);
        item.setBranchId(10L);
        item.setCreatedBy(99L);
        item.setPrivacyLevel(privacy);
        item.setSensitiveLevel(sensitive);
        item.setDataStatus(status);
        return item;
    }
}
