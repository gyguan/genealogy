package com.genealogy.tracking.application;

import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.tracking.dto.TrackingObjectResponse;
import com.genealogy.tracking.repository.TrackingObjectQueryRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TrackingObjectSearchApplicationServiceTest {

    private final TrackingObjectQueryRepository queryRepository = mock(TrackingObjectQueryRepository.class);
    private final RbacAuthorizationApplicationService authorization = mock(RbacAuthorizationApplicationService.class);
    private final TrackingObjectSearchApplicationService service = new TrackingObjectSearchApplicationService(
            queryRepository,
            authorization
    );

    @Test
    void delegatesOneObjectTypeToDatabasePagingWithPermissionScope() {
        when(authorization.permissionDataScope(9L, 1L, "operation_log.view"))
                .thenReturn(PermissionDataScope.branches(Set.of(10L, 11L)));
        PageResponse<TrackingObjectResponse> expected = PageResponse.of(List.of(), 0L, 2, 50);
        when(queryRepository.search(
                1L, "person", "张三", 10L, "official", null, null,
                false, List.of(10L, 11L), 2, 50
        )).thenReturn(expected);

        PageResponse<TrackingObjectResponse> result = service.search(
                1L, 9L, "persons", " 张三 ", 10L, " official ",
                null, null, 2, 100
        );

        assertThat(result).isSameAs(expected);
        verify(queryRepository).search(
                1L, "person", "张三", 10L, "official", null, null,
                false, List.of(10L, 11L), 2, 50
        );
    }

    @Test
    void explicitBranchOutsidePermissionScopeReturnsEmptyBeforeQuery() {
        when(authorization.permissionDataScope(9L, 1L, "operation_log.view"))
                .thenReturn(PermissionDataScope.branches(Set.of(10L)));

        PageResponse<TrackingObjectResponse> result = service.search(
                1L, 9L, "person", null, 99L, null,
                null, null, 1, 20
        );

        assertThat(result.records()).isEmpty();
        assertThat(result.total()).isZero();
        verify(queryRepository, never()).search(
                1L, "person", null, 99L, null, null, null,
                false, List.of(10L), 1, 20
        );
    }

    @Test
    void unsupportedObjectTypeAndInvalidTimeRangeAreRejected() {
        assertThatThrownBy(() -> service.search(
                1L, 9L, "all", null, null, null,
                null, null, 1, 20
        )).isInstanceOf(BusinessException.class)
                .hasMessageContaining("不支持");

        assertThatThrownBy(() -> service.search(
                1L, 9L, "source", null, null, null,
                LocalDateTime.of(2026, 7, 2, 0, 0),
                LocalDateTime.of(2026, 7, 1, 0, 0),
                1, 20
        )).isInstanceOf(BusinessException.class)
                .hasMessageContaining("开始时间");
    }
}
