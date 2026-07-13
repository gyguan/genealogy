package com.genealogy.operationlog.application;

import com.genealogy.common.api.PageResponse;
import com.genealogy.operationlog.dto.OperationLogResponse;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.OperationLogRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OperationLogApplicationServiceTest {

    private final OperationLogRepository repository = mock(OperationLogRepository.class);
    private final OperationLogApplicationService service = new OperationLogApplicationService(repository);

    @Test
    @SuppressWarnings("unchecked")
    void ordinaryViewerDoesNotReceiveTechnicalFields() {
        OperationLogEntity entity = operationLog();
        when(repository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        PageResponse<OperationLogResponse> result = service.search(
                1L, null, null, null, null, null, null, null, 1, 20, false
        );

        OperationLogResponse response = result.records().getFirst();
        assertThat(response.summary()).isEqualTo("更新人物档案");
        assertThat(response.detail()).isNull();
        assertThat(response.requestId()).isNull();
        assertThat(response.clientIp()).isNull();
    }

    @Test
    @SuppressWarnings("unchecked")
    void exportPermissionAllowsTechnicalFields() {
        OperationLogEntity entity = operationLog();
        when(repository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        PageResponse<OperationLogResponse> result = service.search(
                1L, null, null, null, null, null, null, null, 1, 20, true
        );

        OperationLogResponse response = result.records().getFirst();
        assertThat(response.detail()).isEqualTo("before=A, after=B");
        assertThat(response.requestId()).isEqualTo("request-1");
        assertThat(response.clientIp()).isEqualTo("192.0.2.8");
    }

    @Test
    @SuppressWarnings("unchecked")
    void compatibilitySearchIsSecureByDefault() {
        OperationLogEntity entity = operationLog();
        when(repository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        PageResponse<OperationLogResponse> result = service.search(
                1L, null, null, null, null, null, null, null, 1, 20
        );

        assertThat(result.records().getFirst().detail()).isNull();
    }

    @Test
    @SuppressWarnings("unchecked")
    void csvExportUsesHardMaximumAndContainsTechnicalEvidence() {
        OperationLogEntity entity = operationLog();
        when(repository.findAll(any(Specification.class), any(Pageable.class)))
                .thenAnswer(invocation -> {
                    Pageable pageable = invocation.getArgument(1);
                    return new PageImpl<>(List.of(entity), pageable, 1);
                });

        byte[] csv = service.exportCsv(1L, null, null, null, null, null, null, null);

        org.mockito.ArgumentCaptor<Pageable> pageableCaptor = org.mockito.ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findAll(any(Specification.class), pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(OperationLogApplicationService.EXPORT_LIMIT);
        assertThat(new String(csv, StandardCharsets.UTF_8))
                .contains("detail,requestId,clientIp")
                .contains("before=A, after=B")
                .contains("request-1")
                .contains("192.0.2.8");
    }

    private OperationLogEntity operationLog() {
        OperationLogEntity entity = new OperationLogEntity();
        entity.setId(10L);
        entity.setClanId(1L);
        entity.setActorId(20L);
        entity.setActionType("person_update");
        entity.setTargetType("person");
        entity.setTargetId(30L);
        entity.setSummary("更新人物档案");
        entity.setDetail("before=A, after=B");
        entity.setRequestId("request-1");
        entity.setClientIp("192.0.2.8");
        entity.setCreatedAt(LocalDateTime.of(2026, 7, 13, 18, 45));
        return entity;
    }
}
