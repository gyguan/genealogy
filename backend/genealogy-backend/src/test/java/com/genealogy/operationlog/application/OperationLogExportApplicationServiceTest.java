package com.genealogy.operationlog.application;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OperationLogExportApplicationServiceTest {

    private final OperationLogApplicationService operationLogApplicationService = mock(OperationLogApplicationService.class);
    private final OperationLogMultiValueQueryService multiValueQueryService = mock(OperationLogMultiValueQueryService.class);
    private final OperationLogExportApplicationService service = new OperationLogExportApplicationService(
            operationLogApplicationService,
            multiValueQueryService
    );

    @Test
    void successfulExportUsesRepeatedFiltersAndWritesExplicitRiskAuditWithoutCopyingKeyword() {
        byte[] expected = new byte[]{1, 2, 3};
        LocalDateTime start = LocalDateTime.of(2026, 7, 1, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 7, 13, 23, 59);
        when(multiValueQueryService.exportCsv(
                1L,
                List.of(20L, 21L),
                List.of("person_update", "source_update"),
                List.of("person", "source"),
                30L,
                List.of("approved", "rejected"),
                start,
                end,
                "张三"
        )).thenReturn(expected);

        byte[] result = service.exportCsv(
                1L,
                99L,
                List.of(20L, 21L),
                List.of("person_update", "source_update"),
                List.of("person", "source"),
                30L,
                List.of("approved", "rejected"),
                start,
                end,
                "张三"
        );

        assertThat(result).isSameAs(expected);
        ArgumentCaptor<String> detailCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<OperationRiskContext> riskCaptor = ArgumentCaptor.forClass(OperationRiskContext.class);
        verify(operationLogApplicationService).recordRisk(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(99L),
                org.mockito.ArgumentMatchers.eq("operation_log_export"),
                org.mockito.ArgumentMatchers.eq("operation_log"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("导出操作日志"),
                detailCaptor.capture(),
                riskCaptor.capture()
        );
        assertThat(detailCaptor.getValue())
                .contains("exportLimit=10000")
                .contains("actorFilters=[20, 21]")
                .contains("resultFilters=[approved, rejected]")
                .contains("keywordProvided=true")
                .doesNotContain("张三");
        assertThat(riskCaptor.getValue()).isEqualTo(OperationRiskPolicy.bulkExport(null));
    }
}
