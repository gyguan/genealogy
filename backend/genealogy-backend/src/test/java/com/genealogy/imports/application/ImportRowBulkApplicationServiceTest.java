package com.genealogy.imports.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobRowResponse;
import com.genealogy.imports.dto.ImportRowBulkOperationResponse;
import com.genealogy.imports.dto.ImportRowBulkRetryRequest;
import com.genealogy.imports.dto.ImportRowBulkSelectionRequest;
import com.genealogy.imports.dto.ImportRowVersionReference;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImportRowBulkApplicationServiceTest {

    @Mock
    private ImportJobRepository jobRepository;
    @Mock
    private ImportJobRowRepository rowRepository;
    @Mock
    private ImportRowBulkMutationExecutor mutationExecutor;
    @Mock
    private AuthorizationApplicationService authorizationApplicationService;
    @Mock
    private OperationLogApplicationService operationLogApplicationService;

    private ImportRowBulkApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ImportRowBulkApplicationService(
                jobRepository,
                rowRepository,
                mutationExecutor,
                authorizationApplicationService,
                operationLogApplicationService,
                new ObjectMapper()
        );
    }

    @Test
    void selectedRetryShouldReturnPartialSuccessWithoutRollingBackOtherRows() {
        ImportJobEntity job = editableJob();
        when(jobRepository.findByIdAndClanId(10L, 1L)).thenReturn(Optional.of(job));
        when(jobRepository.findById(10L)).thenReturn(Optional.of(job));
        when(rowRepository.countByJobIdAndRowStatusIn(eq(10L), any(Set.class))).thenReturn(1L);
        when(rowRepository.countByJobIdAndRowStatus(10L, ImportJobRowEntity.STATUS_EXCLUDED)).thenReturn(0L);
        when(mutationExecutor.retry(1L, 10L, 2, 0L, null, 9L)).thenReturn(response(2, "draft_created", null, null, 1L));
        when(mutationExecutor.retry(1L, 10L, 3, 4L, null, 9L))
                .thenThrow(new BusinessException("IMPORT_JOB_ROW_VERSION_CONFLICT", "该行已被其他用户修改，请刷新后重试"));

        ImportRowBulkOperationResponse result = service.retry(
                1L,
                10L,
                new ImportRowBulkRetryRequest(new ImportRowBulkSelectionRequest(
                        "selected",
                        List.of(new ImportRowVersionReference(2, 0L), new ImportRowVersionReference(3, 4L))
                )),
                9L
        );

        assertThat(result.matchedCount()).isEqualTo(2);
        assertThat(result.processedCount()).isEqualTo(2);
        assertThat(result.successCount()).isEqualTo(1);
        assertThat(result.failureCount()).isEqualTo(1);
        assertThat(result.remainingFailureCount()).isEqualTo(1);
        assertThat(result.items()).extracting(item -> item.success()).containsExactly(true, false);
        assertThat(result.items().get(1).errorCode()).isEqualTo("IMPORT_JOB_ROW_VERSION_CONFLICT");
        verify(mutationExecutor).retry(1L, 10L, 2, 0L, null, 9L);
        verify(mutationExecutor).retry(1L, 10L, 3, 4L, null, 9L);
    }

    @Test
    void filteredSelectionShouldRejectMoreThanFiveHundredRows() {
        ImportJobEntity job = editableJob();
        ImportJobRowEntity row = failedRow(2, 0L);
        when(jobRepository.findByIdAndClanId(10L, 1L)).thenReturn(Optional.of(job));
        when(rowRepository.findByJobIdAndRowStatusInOrderByRowNoAsc(
                eq(10L), any(Set.class), any(PageRequest.class)
        )).thenReturn(new PageImpl<>(List.of(row), PageRequest.of(0, 501), 501));

        BusinessException error = catchThrowableOfType(
                () -> service.retry(
                        1L,
                        10L,
                        new ImportRowBulkRetryRequest(new ImportRowBulkSelectionRequest("filtered", null)),
                        9L
                ),
                BusinessException.class
        );

        assertThat(error).isNotNull();
        assertThat(error.getCode()).isEqualTo("IMPORT_BULK_SELECTION_TOO_LARGE");
        verify(mutationExecutor, never()).retry(anyLong(), anyLong(), anyInt(), anyLong(), any(), anyLong());
    }

    @Test
    void failureExportShouldUseStableRowKeyAndPreserveRawData() throws Exception {
        ImportJobEntity job = editableJob();
        ImportJobRowEntity row = failedRow(7, 3L);
        row.setRawData("张三,男,五代");
        LinkedHashMap<String, Object> correction = new LinkedHashMap<>();
        correction.put("name", "张三");
        correction.put("generationNo", 5);
        row.setCorrectedData(correction);
        row.setErrorCode("IMPORT_GENERATION_INVALID");
        row.setErrorMessage("代次格式错误");
        row.setRetryCount(2);
        when(jobRepository.findByIdAndClanId(10L, 1L)).thenReturn(Optional.of(job));
        when(rowRepository.findByJobIdAndRowStatusInOrderByRowNoAsc(
                eq(10L), any(Set.class), any(PageRequest.class)
        )).thenReturn(new PageImpl<>(List.of(row), PageRequest.of(0, 500), 1));

        ImportRowBulkApplicationService.ImportFailureExport export = service.exportFailures(1L, 10L, 9L);

        assertThat(export.filename()).isEqualTo("import-failures-10.xlsx");
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(export.content()))) {
            assertThat(workbook.getSheetAt(0).getRow(1).getCell(0).getStringCellValue()).isEqualTo("row-7");
            assertThat(workbook.getSheetAt(0).getRow(1).getCell(1).getStringCellValue()).isEqualTo("7");
            assertThat(workbook.getSheetAt(0).getRow(1).getCell(2).getStringCellValue()).isEqualTo("张三,男,五代");
            assertThat(workbook.getSheetAt(0).getRow(1).getCell(3).getStringCellValue()).contains("\"generationNo\":5");
            assertThat(workbook.getSheetAt(0).getRow(1).getCell(7).getStringCellValue()).isEqualTo("3");
        }
    }

    private ImportJobEntity editableJob() {
        ImportJobEntity job = new ImportJobEntity();
        job.setId(10L);
        job.setClanId(1L);
        job.setBranchId(2L);
        job.setImportType("person_csv");
        job.setOriginalFilename("persons.csv");
        job.setProcessingStatus(ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
        job.setReviewStatus(ImportJobEntity.REVIEW_NOT_SUBMITTED);
        job.setCreatedAt(LocalDateTime.now().minusMinutes(5));
        job.setUpdatedAt(LocalDateTime.now());
        return job;
    }

    private ImportJobRowEntity failedRow(int rowNo, long version) {
        ImportJobRowEntity row = new ImportJobRowEntity();
        row.setId((long) rowNo);
        row.setJobId(10L);
        row.setRowNo(rowNo);
        row.setRawData("raw");
        row.setRowStatus(ImportJobRowEntity.STATUS_INVALID);
        row.setRetryCount(0);
        row.setVersion(version);
        row.setCreatedAt(LocalDateTime.now());
        row.setUpdatedAt(LocalDateTime.now());
        return row;
    }

    private ImportJobRowResponse response(
            int rowNo,
            String status,
            String code,
            String message,
            long version
    ) {
        return new ImportJobRowResponse(
                (long) rowNo,
                rowNo,
                "raw",
                null,
                null,
                status,
                code,
                message,
                1,
                ImportJobRowEntity.STATUS_DRAFT_CREATED.equals(status),
                version,
                LocalDateTime.now()
        );
    }
}
