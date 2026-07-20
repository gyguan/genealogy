package com.genealogy.operationlog.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.application.OperationLogBusinessViewApplicationService;
import com.genealogy.operationlog.application.OperationLogExportApplicationService;
import com.genealogy.operationlog.application.OperationLogMultiValueQueryService;
import com.genealogy.operationlog.application.OperationRiskAuditApplicationService;
import com.genealogy.operationlog.application.OperationRiskBusinessViewApplicationService;
import com.genealogy.operationlog.dto.OperationLogResponse;
import com.genealogy.operationlog.dto.RiskAuditEventResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class OpLogControllerTest {

    private final OperationLogApplicationService operationLogApplicationService = mock(OperationLogApplicationService.class);
    private final OperationLogMultiValueQueryService multiValueQueryService = mock(OperationLogMultiValueQueryService.class);
    private final OperationLogBusinessViewApplicationService businessViewApplicationService = mock(OperationLogBusinessViewApplicationService.class);
    private final OperationLogExportApplicationService exportApplicationService = mock(OperationLogExportApplicationService.class);
    private final OperationRiskAuditApplicationService riskAuditApplicationService = mock(OperationRiskAuditApplicationService.class);
    private final OperationRiskBusinessViewApplicationService riskBusinessViewApplicationService = mock(OperationRiskBusinessViewApplicationService.class);
    private final AuthorizationApplicationService authorizationApplicationService = mock(AuthorizationApplicationService.class);
    private final RbacAuthorizationApplicationService rbacAuthorizationApplicationService = mock(RbacAuthorizationApplicationService.class);
    private final OpLogController controller = new OpLogController(
            operationLogApplicationService,
            multiValueQueryService,
            businessViewApplicationService,
            exportApplicationService,
            riskAuditApplicationService,
            riskBusinessViewApplicationService,
            authorizationApplicationService,
            rbacAuthorizationApplicationService
    );

    @Test
    void operationListPassesRepeatedFiltersToDatabaseQueryService() {
        when(authorizationApplicationService.requireLogin("Bearer token")).thenReturn(99L);
        when(authorizationApplicationService.hasDirectClanPermission(1L, 99L, "operation_log.export"))
                .thenReturn(false);
        PageResponse<OperationLogResponse> rawPage = PageResponse.of(List.of(), 0, 1, 20);
        when(multiValueQueryService.search(
                1L,
                List.of(7L, 9L),
                List.of("create", "update"),
                List.of("person", "source"),
                null,
                List.of("approved", "rejected"),
                null,
                null,
                "张",
                1,
                20,
                false
        )).thenReturn(rawPage);
        when(businessViewApplicationService.enrich(rawPage, 1L, 99L)).thenReturn(rawPage);

        controller.listOperations(
                "Bearer token",
                1L,
                List.of(7L, 9L),
                List.of("create", "update"),
                List.of("person", "source"),
                null,
                List.of("approved", "rejected"),
                null,
                null,
                "张",
                1,
                20
        );

        verify(authorizationApplicationService)
                .requireDirectClanPermission(1L, 99L, "operation_log.view");
        verify(multiValueQueryService).search(
                1L,
                List.of(7L, 9L),
                List.of("create", "update"),
                List.of("person", "source"),
                null,
                List.of("approved", "rejected"),
                null,
                null,
                "张",
                1,
                20,
                false
        );
        verify(businessViewApplicationService).enrich(rawPage, 1L, 99L);
    }

    @Test
    void riskListSupportsRepeatedFiltersAndKeepsPermissionScope() {
        when(authorizationApplicationService.requireLogin("Bearer token")).thenReturn(99L);
        when(authorizationApplicationService.hasDirectClanPermission(1L, 99L, "operation_log.export"))
                .thenReturn(false);
        PermissionDataScope scope = PermissionDataScope.full();
        when(rbacAuthorizationApplicationService.permissionDataScope(99L, 1L, "operation_risk.view"))
                .thenReturn(scope);
        PageResponse<RiskAuditEventResponse> rawPage = PageResponse.of(List.of(), 0, 1, 20);
        when(riskAuditApplicationService.search(
                1L,
                List.of(7L),
                List.of("high", "critical"),
                List.of("bulk_export"),
                List.of(3L),
                List.of("open"),
                null,
                null,
                1,
                20,
                false,
                scope
        )).thenReturn(rawPage);
        when(riskBusinessViewApplicationService.enrich(rawPage, 1L, 99L)).thenReturn(rawPage);

        controller.listRisks(
                "Bearer token",
                1L,
                List.of(7L),
                List.of("high", "critical"),
                List.of("bulk_export"),
                List.of(3L),
                List.of("open"),
                null,
                null,
                1,
                20
        );

        verify(authorizationApplicationService)
                .requireDirectClanPermission(1L, 99L, "operation_risk.view");
        verify(rbacAuthorizationApplicationService)
                .permissionDataScope(99L, 1L, "operation_risk.view");
        verify(riskAuditApplicationService).search(
                1L,
                List.of(7L),
                List.of("high", "critical"),
                List.of("bulk_export"),
                List.of(3L),
                List.of("open"),
                null,
                null,
                1,
                20,
                false,
                scope
        );
    }

    @Test
    void riskStatsDenialStopsBeforeSensitiveCountQuery() {
        when(authorizationApplicationService.requireLogin("Bearer token")).thenReturn(99L);
        when(authorizationApplicationService.requireDirectClanPermission(2L, 99L, "operation_risk.view"))
                .thenThrow(new BusinessException("AUTH_FORBIDDEN", "当前用户不是该宗族成员"));

        assertThatThrownBy(() -> controller.riskStats(
                "Bearer token", 2L, List.of(), List.of(), List.of(), List.of(), List.of(), null, null
        )).isInstanceOf(BusinessException.class);

        verifyNoInteractions(riskAuditApplicationService, riskBusinessViewApplicationService, rbacAuthorizationApplicationService);
    }

    @Test
    void crossClanOrNonMemberDenialStopsBeforeLogQuery() {
        when(authorizationApplicationService.requireLogin("Bearer token")).thenReturn(99L);
        when(authorizationApplicationService.requireDirectClanPermission(2L, 99L, "operation_log.view"))
                .thenThrow(new BusinessException("AUTH_FORBIDDEN", "当前用户不是该宗族成员"));

        assertThatThrownBy(() -> controller.listOperations(
                "Bearer token", 2L, List.of(), List.of(), List.of(), null, List.of(),
                null, null, null, 1, 20
        )).isInstanceOf(BusinessException.class);

        verifyNoInteractions(multiValueQueryService, businessViewApplicationService);
    }

    @Test
    void exportRequiresDedicatedPermissionAndPassesRepeatedFilters() {
        when(authorizationApplicationService.requireLogin("Bearer token")).thenReturn(99L);
        when(exportApplicationService.exportCsv(
                1L,
                99L,
                List.of(7L, 9L),
                List.of("create", "update"),
                List.of("person", "source"),
                null,
                List.of("approved", "rejected"),
                null,
                null,
                "张"
        )).thenReturn(new byte[]{1});

        controller.exportOperations(
                "Bearer token",
                1L,
                List.of(7L, 9L),
                List.of("create", "update"),
                List.of("person", "source"),
                null,
                List.of("approved", "rejected"),
                null,
                null,
                "张"
        );

        verify(authorizationApplicationService)
                .requireDirectClanPermission(1L, 99L, "operation_log.export");
        verify(exportApplicationService).exportCsv(
                1L,
                99L,
                List.of(7L, 9L),
                List.of("create", "update"),
                List.of("person", "source"),
                null,
                List.of("approved", "rejected"),
                null,
                null,
                "张"
        );
    }

    @Test
    void allEndpointsRequireClanIdAndAcceptAuthorizationHeaderForStableAuthErrors() {
        for (String methodName : List.of(
                "listOperations", "listRisks", "riskStats", "exportOperations", "operationStats"
        )) {
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
