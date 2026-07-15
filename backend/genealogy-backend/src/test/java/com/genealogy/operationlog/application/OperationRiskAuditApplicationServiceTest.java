package com.genealogy.operationlog.application;

import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.dto.RiskAuditEventResponse;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.OperationLogRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class OperationRiskAuditApplicationServiceTest {

    private final OperationLogRepository repository = mock(OperationLogRepository.class);
    private final EntityManager entityManager = mock(EntityManager.class);
    private final OperationRiskAuditApplicationService service = new OperationRiskAuditApplicationService(
            repository,
            entityManager
    );

    @Test
    void rejectsBranchOutsidePermissionScopeBeforeDatabaseQuery() {
        PermissionDataScope scope = PermissionDataScope.branches(Set.of(10L, 11L));

        assertThatThrownBy(() -> service.search(
                1L, null, null, null, 99L, null,
                null, null, 1, 20, false, scope
        )).isInstanceOf(BusinessException.class)
                .hasMessageContaining("无权查看该支派");

        verifyNoInteractions(repository, entityManager);
    }

    @Test
    void rejectsUnknownRiskEnumsBeforeDatabaseQuery() {
        assertThatThrownBy(() -> service.search(
                1L, null, "urgent", null, null, null,
                null, null, 1, 20, false, PermissionDataScope.full()
        )).isInstanceOf(BusinessException.class)
                .hasMessageContaining("风险等级");

        verifyNoInteractions(repository, entityManager);
    }

    @SuppressWarnings("unchecked")
    @Test
    void paginatesRiskRowsAndHidesTechnicalFieldsWithoutExportPermission() {
        OperationLogEntity entity = new OperationLogEntity();
        entity.setId(7L);
        entity.setClanId(1L);
        entity.setActorId(9L);
        entity.setActionType("operation_log_export");
        entity.setTargetType("operation_log");
        entity.setRiskLevel("high");
        entity.setRiskEventType("bulk_export");
        entity.setDispositionStatus("resolved");
        entity.setSummary("导出操作日志");
        entity.setDetail("technical detail");
        entity.setRequestId("request-1");
        entity.setClientIp("127.0.0.1");
        entity.setCreatedAt(LocalDateTime.of(2026, 7, 15, 10, 0));
        when(repository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        PageResponse<RiskAuditEventResponse> page = service.search(
                1L, null, "high", "bulk_export", null, "resolved",
                null, null, 1, 20, false, PermissionDataScope.full()
        );

        assertThat(page.total()).isEqualTo(1);
        assertThat(page.records()).singleElement().satisfies(record -> {
            assertThat(record.riskLevel()).isEqualTo("high");
            assertThat(record.eventType()).isEqualTo("bulk_export");
            assertThat(record.detailAvailable()).isFalse();
            assertThat(record.detail()).isNull();
            assertThat(record.requestId()).isNull();
            assertThat(record.clientIp()).isNull();
        });
    }
}
