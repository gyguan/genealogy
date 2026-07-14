package com.genealogy.imports.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.imports.dto.ImportJobRowResponse;
import com.genealogy.imports.dto.ImportRowBulkOperationResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImportRowCorrectionUploadTest {

    private static final String[] HEADERS = {
            "稳定行键", "原始行号", "原始数据", "当前修正数据(JSON)", "错误码", "错误说明", "重试次数", "版本"
    };

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
    void uploadShouldRetryValidRowsAndReportInvalidStableKeysIndependently() throws Exception {
        ImportJobEntity job = editableJob();
        when(jobRepository.findByIdAndClanId(10L, 1L)).thenReturn(Optional.of(job));
        when(jobRepository.findById(10L)).thenReturn(Optional.of(job));
        when(rowRepository.countByJobIdAndRowStatusIn(eq(10L), any(Set.class))).thenReturn(1L);
        when(rowRepository.countByJobIdAndRowStatus(10L, ImportJobRowEntity.STATUS_EXCLUDED)).thenReturn(0L);
        when(mutationExecutor.retry(1L, 10L, 7, 3L, Map.of("name", "张三"), 9L))
                .thenReturn(response(7, 4L));

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "import-failures-10.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                correctionWorkbook()
        );

        ImportRowBulkOperationResponse result = service.uploadCorrections(1L, 10L, file, true, 9L);

        assertThat(result.matchedCount()).isEqualTo(2);
        assertThat(result.successCount()).isEqualTo(1);
        assertThat(result.failureCount()).isEqualTo(1);
        assertThat(result.items().get(0).stableRowKey()).isEqualTo("row-7");
        assertThat(result.items().get(1).errorCode()).isEqualTo("IMPORT_CORRECTION_FILE_ROW_INVALID");
        assertThat(result.items().get(1).errorMessage()).contains("稳定行键");
        verify(mutationExecutor).retry(1L, 10L, 7, 3L, Map.of("name", "张三"), 9L);
    }

    private byte[] correctionWorkbook() throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var sheet = workbook.createSheet("失败行");
            Row header = sheet.createRow(0);
            for (int index = 0; index < HEADERS.length; index++) header.createCell(index).setCellValue(HEADERS[index]);

            Row valid = sheet.createRow(1);
            valid.createCell(0).setCellValue("row-7");
            valid.createCell(1).setCellValue("7");
            valid.createCell(2).setCellValue("raw");
            valid.createCell(3).setCellValue("{\"name\":\"张三\"}");
            valid.createCell(4).setCellValue("IMPORT_PERSON_NAME_REQUIRED");
            valid.createCell(5).setCellValue("姓名不能为空");
            valid.createCell(6).setCellValue("1");
            valid.createCell(7).setCellValue("3");

            Row invalid = sheet.createRow(2);
            invalid.createCell(0).setCellValue("row-99");
            invalid.createCell(1).setCellValue("8");
            invalid.createCell(2).setCellValue("raw");
            invalid.createCell(3).setCellValue("{\"name\":\"李四\"}");
            invalid.createCell(4).setCellValue("IMPORT_PERSON_NAME_REQUIRED");
            invalid.createCell(5).setCellValue("姓名不能为空");
            invalid.createCell(6).setCellValue("0");
            invalid.createCell(7).setCellValue("2");

            workbook.write(output);
            return output.toByteArray();
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

    private ImportJobRowResponse response(int rowNo, long version) {
        return new ImportJobRowResponse(
                (long) rowNo,
                rowNo,
                "raw",
                null,
                Map.of("name", "张三"),
                ImportJobRowEntity.STATUS_DRAFT_CREATED,
                null,
                null,
                2,
                true,
                version,
                LocalDateTime.now()
        );
    }
}
