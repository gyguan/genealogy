package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobRowResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImportRowBulkMutationExecutorTest {

    @Mock
    private ImportJobRepository jobRepository;
    @Mock
    private ImportJobRowRepository rowRepository;
    @Mock
    private ImportJobErrorRepository errorRepository;
    @Mock
    private ImportJobRowApplicationService personRowService;
    @Mock
    private RelationshipImportJobRowApplicationService relationshipRowService;
    @Mock
    private SourceImportJobRowApplicationService sourceRowService;
    @Mock
    private AuthorizationApplicationService authorizationApplicationService;

    private ImportRowBulkMutationExecutor executor;

    @BeforeEach
    void setUp() {
        executor = new ImportRowBulkMutationExecutor(
                jobRepository,
                rowRepository,
                errorRepository,
                personRowService,
                relationshipRowService,
                sourceRowService,
                authorizationApplicationService
        );
    }

    @Test
    void excludeShouldRetainEvidenceAndMoveBatchToReadyForReview() {
        ImportJobEntity job = editableJob();
        ImportJobRowEntity row = failedRow(7, 2L);
        when(jobRepository.findByIdAndClanIdForUpdate(10L, 1L)).thenReturn(Optional.of(job));
        when(rowRepository.findByJobIdAndRowNoForUpdate(10L, 7)).thenReturn(Optional.of(row));
        when(rowRepository.saveAndFlush(row)).thenReturn(row);
        when(rowRepository.countByJobId(10L)).thenReturn(2L);
        when(rowRepository.countByJobIdAndRowStatus(10L, ImportJobRowEntity.STATUS_DRAFT_CREATED)).thenReturn(1L);
        when(rowRepository.countByJobIdAndRowStatusIn(eq(10L), any(Set.class))).thenReturn(0L);
        when(rowRepository.countByJobIdAndRowStatus(10L, ImportJobRowEntity.STATUS_EXCLUDED)).thenReturn(1L);

        ImportJobRowResponse response = executor.exclude(1L, 10L, 7, 2L, "原始资料无法核实", 9L);

        assertThat(response.rowStatus()).isEqualTo(ImportJobRowEntity.STATUS_EXCLUDED);
        assertThat(row.getExcludedReason()).isEqualTo("原始资料无法核实");
        assertThat(row.getExcludedBy()).isEqualTo(9L);
        assertThat(row.getExcludedAt()).isNotNull();
        assertThat(row.getRawData()).isEqualTo("raw-data");
        assertThat(job.getFailureCount()).isZero();
        assertThat(job.getSuccessCount()).isEqualTo(1);
        assertThat(job.getProcessingStatus()).isEqualTo(ImportJobEntity.PROCESSING_READY_FOR_REVIEW);
        assertThat(job.getStatus()).isEqualTo("completed");
        verify(errorRepository).deleteByJobIdAndRowNo(10L, 7);
        verify(jobRepository).save(job);
    }

    @Test
    void excludeShouldRejectStaleVersionWithoutChangingRow() {
        ImportJobEntity job = editableJob();
        ImportJobRowEntity row = failedRow(7, 3L);
        when(jobRepository.findByIdAndClanIdForUpdate(10L, 1L)).thenReturn(Optional.of(job));
        when(rowRepository.findByJobIdAndRowNoForUpdate(10L, 7)).thenReturn(Optional.of(row));

        BusinessException error = catchThrowableOfType(
                () -> executor.exclude(1L, 10L, 7, 2L, "无效行", 9L),
                BusinessException.class
        );

        assertThat(error).isNotNull();
        assertThat(error.getCode()).isEqualTo("IMPORT_JOB_ROW_VERSION_CONFLICT");
        assertThat(row.getRowStatus()).isEqualTo(ImportJobRowEntity.STATUS_INVALID);
        assertThat(row.getExcludedReason()).isNull();
        verify(rowRepository, never()).saveAndFlush(any(ImportJobRowEntity.class));
        verify(errorRepository, never()).deleteByJobIdAndRowNo(10L, 7);
    }

    private ImportJobEntity editableJob() {
        ImportJobEntity job = new ImportJobEntity();
        job.setId(10L);
        job.setClanId(1L);
        job.setBranchId(2L);
        job.setImportType("person_csv");
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
        row.setRawData("raw-data");
        row.setRowStatus(ImportJobRowEntity.STATUS_INVALID);
        row.setRetryCount(0);
        row.setVersion(version);
        row.setCreatedAt(LocalDateTime.now());
        row.setUpdatedAt(LocalDateTime.now());
        return row;
    }
}
