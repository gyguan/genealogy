package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PersonImportCommandApplicationServiceTest {

    @Mock
    private ImportApplicationService importApplicationService;

    @Mock
    private OperationLogApplicationService operationLogApplicationService;

    private PersonImportCommandApplicationService service;

    @BeforeEach
    void setUp() {
        service = new PersonImportCommandApplicationService(
                importApplicationService,
                operationLogApplicationService
        );
    }

    @Test
    void successfulImportShouldRecordBatchSummaryWithoutRawRows() {
        MockMultipartFile file = new MockMultipartFile("file", "persons.csv", "text/csv", "姓名\n张三".getBytes());
        ImportApplicationService.FieldMapping mapping = ImportApplicationService.FieldMapping.defaults();
        ImportJobResponse response = new ImportJobResponse(
                11L,
                1L,
                5L,
                "person_csv",
                "persons.csv",
                10,
                8,
                2,
                "partial_completed",
                "存在 2 行导入失败",
                LocalDateTime.of(2026, 7, 13, 12, 0),
                List.of()
        );
        when(importApplicationService.importPersonsCsv(1L, 5L, file, mapping, true, true, 9L))
                .thenReturn(response);

        ImportJobResponse result = service.importPersonsCsv(1L, 5L, file, mapping, true, true, 9L);

        assertThat(result).isSameAs(response);
        ArgumentCaptor<String> detailCaptor = ArgumentCaptor.forClass(String.class);
        verify(operationLogApplicationService).record(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(9L),
                org.mockito.ArgumentMatchers.eq("person_import"),
                org.mockito.ArgumentMatchers.eq("import_job"),
                org.mockito.ArgumentMatchers.eq(11L),
                org.mockito.ArgumentMatchers.eq("人物批量导入完成"),
                detailCaptor.capture()
        );
        assertThat(detailCaptor.getValue())
                .contains("branchId=5", "filename=persons.csv", "total=10", "success=8", "failure=2")
                .doesNotContain("张三");
    }

    @Test
    void failedImportShouldNotWriteSuccessAuditRecord() {
        MockMultipartFile file = new MockMultipartFile("file", "persons.csv", "text/csv", new byte[0]);
        ImportApplicationService.FieldMapping mapping = ImportApplicationService.FieldMapping.defaults();
        when(importApplicationService.importPersonsCsv(1L, 5L, file, mapping, true, false, 9L))
                .thenThrow(new BusinessException("IMPORT_FAILED", "导入失败"));

        assertThatThrownBy(() -> service.importPersonsCsv(1L, 5L, file, mapping, true, false, 9L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("导入失败");

        verify(operationLogApplicationService, never()).record(any(), any(), any(), any(), any(), any(), any());
    }
}
