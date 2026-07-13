package com.genealogy.member.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.PageResponse;
import com.genealogy.member.application.MemberPermissionApplicationService;
import com.genealogy.member.application.MemberPermissionAuditApplicationService;
import com.genealogy.member.dto.MemberPermissionAuditResponse;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MemberPermissionAuditControllerTest {

    private final MemberPermissionApplicationService memberService = mock(MemberPermissionApplicationService.class);
    private final MemberPermissionAuditApplicationService auditService = mock(MemberPermissionAuditApplicationService.class);
    private final AuthorizationApplicationService authorizationService = mock(AuthorizationApplicationService.class);
    private final MemberPermissionController controller = new MemberPermissionController(
            memberService,
            auditService,
            authorizationService
    );

    @Test
    void auditEndpointRequiresOperationLogPermissionBeforeQuerying() {
        when(authorizationService.requireLogin("Bearer token")).thenReturn(9L);
        when(auditService.search(1L, 9L, 20L, null, null, null, null, null, 1, 20))
                .thenReturn(PageResponse.of(List.of(), 0, 1, 20));

        var response = controller.audits(
                1L, 20L, null, null, null, null, null, 1, 20, "Bearer token"
        );

        verify(authorizationService).requirePermission(1L, 9L, "operation_log.view");
        verify(auditService).search(1L, 9L, 20L, null, null, null, null, null, 1, 20);
        assertThat(response.getData().records()).isEmpty();
    }
}
