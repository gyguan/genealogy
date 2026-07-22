package com.genealogy.review.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.review.application.ApprovalApplicationService;
import com.genealogy.review.dto.TargetSubmitRequest;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.PostMapping;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ClanReviewControllerTest {

    @Test
    void dedicatedEndpointCallsClanReviewServiceDirectly() {
        ApprovalApplicationService approvalApplicationService = mock(ApprovalApplicationService.class);
        AuthorizationApplicationService authorizationApplicationService = mock(AuthorizationApplicationService.class);
        ClanReviewController controller = new ClanReviewController(
                approvalApplicationService,
                authorizationApplicationService
        );
        when(authorizationApplicationService.requireLogin("Bearer token")).thenReturn(99L);

        controller.submitReview(
                8L,
                new TargetSubmitRequest(null, "提交宗族审核"),
                "Bearer token"
        );

        verify(authorizationApplicationService).requireLogin("Bearer token");
        verify(approvalApplicationService).submitClan(
                8L,
                new TargetSubmitRequest(99L, "提交宗族审核")
        );
        verify(approvalApplicationService, never()).submitGeneric(anyLong(), any(), anyLong());
    }

    @Test
    void exposesStableClanSubmitReviewPath() throws Exception {
        Method method = ClanReviewController.class.getMethod(
                "submitReview",
                Long.class,
                TargetSubmitRequest.class,
                String.class
        );
        PostMapping mapping = method.getAnnotation(PostMapping.class);

        assertArrayEquals(new String[]{"/{clanId}/submit-review"}, mapping.value());
    }
}
