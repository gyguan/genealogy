package com.genealogy.tracking.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.tracking.application.TrackingObjectSearchApplicationService;
import com.genealogy.tracking.application.TrackingTraceApplicationService;
import com.genealogy.tracking.dto.TrackingObjectResponse;
import com.genealogy.tracking.dto.TrackingTraceDetailResponse;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class TrackingControllerTest {

    private final TrackingObjectSearchApplicationService searchService = mock(TrackingObjectSearchApplicationService.class);
    private final TrackingTraceApplicationService traceService = mock(TrackingTraceApplicationService.class);
    private final AuthorizationApplicationService authorization = mock(AuthorizationApplicationService.class);
    private final TrackingController controller = new TrackingController(searchService, traceService, authorization);

    @Test
    void searchRequiresDirectClanViewPermissionBeforeDatabaseQuery() {
        when(authorization.requireLogin("Bearer token")).thenReturn(9L);
        PageResponse<TrackingObjectResponse> page = PageResponse.of(List.of(), 0L, 1, 20);
        when(searchService.search(1L, 9L, "person", "张", null, null, null, null, 1, 20))
                .thenReturn(page);

        assertThat(controller.searchObjects(
                "Bearer token", 1L, "person", "张", null, null,
                null, null, 1, 20
        ).getData()).isSameAs(page);

        verify(authorization).requireDirectClanPermission(1L, 9L, "operation_log.view");
        verify(searchService).search(1L, 9L, "person", "张", null, null, null, null, 1, 20);
    }

    @Test
    void traceUsesSinglePermissionBoundaryAndOnlyIncludesTechnicalFieldsForExporters() {
        when(authorization.requireLogin("Bearer token")).thenReturn(9L);
        when(authorization.hasDirectClanPermission(1L, 9L, "operation_log.export")).thenReturn(false);
        TrackingTraceDetailResponse detail = mock(TrackingTraceDetailResponse.class);
        when(traceService.trace(1L, 9L, "person", 100L, false)).thenReturn(detail);

        assertThat(controller.traceObject("Bearer token", 1L, "person", 100L).getData())
                .isSameAs(detail);

        verify(authorization).requireDirectClanPermission(1L, 9L, "operation_log.view");
        verify(authorization).hasDirectClanPermission(1L, 9L, "operation_log.export");
        verify(traceService).trace(1L, 9L, "person", 100L, false);
    }

    @Test
    void deniedClanAccessStopsBeforeSearch() {
        when(authorization.requireLogin("Bearer token")).thenReturn(9L);
        when(authorization.requireDirectClanPermission(2L, 9L, "operation_log.view"))
                .thenThrow(new BusinessException("AUTH_FORBIDDEN", "当前用户不是该宗族成员"));

        assertThatThrownBy(() -> controller.searchObjects(
                "Bearer token", 2L, "person", null, null, null,
                null, null, 1, 20
        )).isInstanceOf(BusinessException.class);

        verifyNoInteractions(searchService, traceService);
    }
}
