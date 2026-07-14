package com.genealogy.operationlog.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.application.OperationLogBusinessViewApplicationService;
import com.genealogy.operationlog.application.OperationLogExportApplicationService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class OpLogControllerTest {

    private final OperationLogApplicationService operationLogApplicationService = mock(OperationLogApplicationService.class);
    private final OperationLogBusinessViewApplicationService businessViewApplicationService = mock(OperationLogBusinessViewApplicationService.class);
    private final OperationLogExportApplicationService exportApplicationService = mock(OperationLogExportApplicationService.class);
    private final AuthorizationApplicationService authorizationApplicationService = mock(AuthorizationApplicationService.class);
    private final OpLogController controller = new OpLogController(
            operationLogApplicationService,
            businessViewApplicationService,
            exportApplicationService,
            authorizationApplicationService
    );

    @Test
    void listRequiresViewPermissionAndMinimizesTechnicalFieldsWithoutExportGrant() {
        when(authorizationApplicationService.requireLogin("Bearer token")).thenReturn(99L);
        when(authorizationApplicationService.hasDirectClanPermission(1L, 99L, "operation_log.export"))
                .thenReturn(false);
        PageResponse<com.genealogy.operationlog.dto.OperationLogResponse> rawPage = PageResponse.of(java.util.List.of(), 0, 1, 20);
        when(operationLogApplicationService.search(
                eq(1L), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(),
                eq(1), eq(20), eq(false)
        )).thenReturn(rawPage);
        when(businessViewApplicationService.enrich(rawPage, 1L, 99L)).thenReturn(rawPage);

        controller.listOperations(
                "Bearer token", 1L, null, null, null, null,
                null, null, null, 1, 20
        );

        verify(authorizationApplicationService)
                .requireDirectClanPermission(1L, 99L, "operation_log.view");
        verify(operationLogApplicationService).search(
                eq(1L), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(),
                eq(1), eq(20), eq(false)
        );
        verify(businessViewApplicationService).enrich(rawPage, 1L, 99L);
    }

    @Test
    void crossClanOrNonMemberDenialStopsBeforeLogQuery() {
        when(authorizationApplicationService.requireLogin("Bearer token")).thenReturn(99L);
        when(authorizationApplicationService.requireDirectClanPermission(2L, 99L, "operation_log.view"))
                .thenThrow(new BusinessException("AUTH_FORBIDDEN", "当前用户不是该宗族成员"));

        assertThatThrownBy(() -> controller.listOperations(
                "Bearer token", 2L, null, null, null, null,
                null, null, null, 1, 20
        )).isInstanceOf(BusinessException.class);

        verifyNoInteractions(operationLogApplicationService, businessViewApplicationService);
    }

    @Test
    void exportRequiresDedicatedPermissionAndPassesAuthenticatedActorToAuditService() {
        when(authorizationApplicationService.requireLogin("Bearer token")).thenReturn(99L);
        when(exportApplicationService.exportCsv(
                1L, 99L, null, null, null, null, null, null, null
        )).thenReturn(new byte[]{1});

        controller.exportOperations(
                "Bearer token", 1L, null, null, null, null,
                null, null, null
        );

        verify(authorizationApplicationService)
                .requireDirectClanPermission(1L, 99L, "operation_log.export");
        verify(exportApplicationService).exportCsv(
                1L, 99L, null, null, null, null, null, null, null
        );
    }

    @Test
    void allEndpointsRequireClanIdAndAcceptAuthorizationHeaderForStableAuthErrors() {
        for (String methodName : java.util.List.of("listOperations", "exportOperations", "operationStats")) {
            Method method = Arrays.stream(OpLogController.class.getDeclaredMethods())
                    .filter(candidate -> candidate.getName().equals(methodName))
                    .findFirst()
                    .orElseThrow();

            Parameter clanParameter = Arrays.stream(method.getParameters())
                    .filter(parameter -> parameter.getAnnotation(RequestParam.class) != null)
                    .filter(parameter -> "clanId".equals(parameter.getAnnotation(RequestParam.class).value()))
                    .findFirst()
                    .orElseThrow();
            assertThat(clanParameter.getAnnotation(RequestParam.class).required()).isTrue();

            RequestHeader authorizationHeader = Arrays.stream(method.getParameters())
                    .map(parameter -> parameter.getAnnotation(RequestHeader.class))
                    .filter(annotation -> annotation != null)
                    .filter(annotation -> HttpHeaders.AUTHORIZATION.equals(annotation.value()))
                    .findFirst()
                    .orElseThrow();
            assertThat(authorizationHeader.required()).isFalse();
        }
    }
}
