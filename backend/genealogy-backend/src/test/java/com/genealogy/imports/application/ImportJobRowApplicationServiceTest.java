package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobRowResponse;
import com.genealogy.imports.dto.PersonImportRowRetryRequest;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobErrorEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImportJobRowApplicationServiceTest {

    @Mock private ImportJobRepository importJobRepository;
    @Mock private ImportJobRowRepository importJobRowRepository;
    @Mock private ImportJobErrorRepository importJobErrorRepository;
    @Mock private PersonRepository personRepository;
    @Mock private AuthorizationApplicationService authorizationApplicationService;
    @Mock private OperationLogApplicationService operationLogApplicationService;

    private ImportJobRowApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ImportJobRowApplicationService(
                importJobRepository,
                importJobRowRepository,
                importJobErrorRepository,
                personRepository,
                authorizationApplicationService,
                operationLogApplicationService
        );
    }

    @Test
    void listRowsShouldUseFailedStatesAndServerPagination() {
        ImportJobEntity job = correctableJob();
        ImportJobRowEntity row = failedRow();
        when(importJobRepository.findByIdAndClanId(101L, 1L)).thenReturn(Optional.of(job));
        when(importJobRowRepository.findByJobIdAndRowStatusInOrderByRowNoAsc(
                eq(101L),
                eq(Set.of(ImportJobRowEntity.STATUS_INVALID, ImportJobRowEntity.STATUS_RETRY_FAILED)),
                any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of(row)));

        PageResponse<ImportJobRowResponse> page = service.listRows(1L, 101L, "failed", 1, 20, 9L);

        assertThat(page.records()).hasSize(1);
        assertThat(page.records().get(0).rowNo()).isEqualTo(3);
        assertThat(page.records().get(0).draftCreated()).isFalse();
        verify(authorizationApplicationService).requireClanMember(1L, 9L);
        verify(authorizationApplicationService).requireBranchWriteScope(1L, 9L, 5L);
    }

    @Test
    void successfulRetryShouldUseJobBranchAndMoveBatchToReadyForReview() {
        ImportJobEntity job = correctableJob();
        ImportJobRowEntity row = failedRow();
        when(importJobRepository.findByIdAndClanId(101L, 1L)).thenReturn(Optional.of(job));
        when(importJobRowRepository.findByIdAndJobId(201L, 101L)).thenReturn(Optional.of(row));
        when(personRepository.count(any(Specification.class))).thenReturn(0L);
        when(personRepository.save(any(PersonEntity.class))).thenAnswer(invocation -> {
            PersonEntity person = invocation.getArgument(0);
            person.setId(1001L);
            return person;
        });
        when(importJobRowRepository.saveAndFlush(any(ImportJobRowEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(importJobRowRepository.countByJobId(101L)).thenReturn(2L);
        when(importJobRowRepository.countByJobIdAndRowStatus(101L, ImportJobRowEntity.STATUS_DRAFT_CREATED)).thenReturn(2L);
        when(importJobRowRepository.countByJobIdAndRowStatusIn(eq(101L), any())).thenReturn(0L);
        when(importJobRepository.save(any(ImportJobEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ImportJobRowResponse result = service.retryPersonRow(
                1L, 101L, 201L, request("李四", "male", "1982-01-01", 0L), 9L
        );

        assertThat(result.rowStatus()).isEqualTo(ImportJobRowEntity.STATUS_DRAFT_CREATED);
        assertThat(result.draftCreated()).isTrue();
        ArgumentCaptor<PersonEntity> personCaptor = ArgumentCaptor.forClass(PersonEntity.class);
        verify(personRepository).save(personCaptor.capture());
        assertThat(personCaptor.getValue().getClanId()).isEqualTo(1L);
        assertThat(personCaptor.getValue().getBranchId()).isEqualTo(5L);
        assertThat(personCaptor.getValue().getDataStatus()).isEqualTo("draft");
        assertThat(row.getDraftPersonId()).isEqualTo(1001L);
        assertThat(row.getDraftTargetType()).isEqualTo(ImportJobEntity.TYPE_PERSON);
        assertThat(row.getDraftTargetId()).isEqualTo(1001L);
        assertThat(row.getCorrectedData()).containsEntry("name", "李四");
        verify(importJobErrorRepository).deleteByJobIdAndRowNo(101L, 3);
        assertThat(job.getProcessingStatus()).isEqualTo(ImportJobEntity.PROCESSING_READY_FOR_REVIEW);
        assertThat(job.getFailureCount()).isZero();
        assertThat(job.getErrorSummary()).isNull();
    }

    @Test
    void validationFailureShouldPersistCorrectionAndRemainCorrectable() {
        ImportJobEntity job = correctableJob();
        ImportJobRowEntity row = failedRow();
        when(importJobRepository.findByIdAndClanId(101L, 1L)).thenReturn(Optional.of(job));
        when(importJobRowRepository.findByIdAndJobId(201L, 101L)).thenReturn(Optional.of(row));
        when(importJobRowRepository.saveAndFlush(any(ImportJobRowEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(importJobErrorRepository.findFirstByJobIdAndRowNo(101L, 3)).thenReturn(Optional.empty());
        when(importJobRowRepository.countByJobId(101L)).thenReturn(2L);
        when(importJobRowRepository.countByJobIdAndRowStatus(101L, ImportJobRowEntity.STATUS_DRAFT_CREATED)).thenReturn(1L);
        when(importJobRowRepository.countByJobIdAndRowStatusIn(eq(101L), any())).thenReturn(1L);
        when(importJobRepository.save(any(ImportJobEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ImportJobRowResponse result = service.retryPersonRow(
                1L, 101L, 201L, request("李四", "unexpected", "1982-01-01", 0L), 9L
        );

        assertThat(result.rowStatus()).isEqualTo(ImportJobRowEntity.STATUS_RETRY_FAILED);
        assertThat(result.errorCode()).isEqualTo("IMPORT_GENDER_INVALID");
        assertThat(result.correctedData()).containsEntry("gender", "unexpected");
        assertThat(result.retryCount()).isEqualTo(1);
        verify(personRepository, never()).save(any(PersonEntity.class));
        ArgumentCaptor<ImportJobErrorEntity> errorCaptor = ArgumentCaptor.forClass(ImportJobErrorEntity.class);
        verify(importJobErrorRepository).save(errorCaptor.capture());
        assertThat(errorCaptor.getValue().getErrorMessage()).contains("性别必须是");
        assertThat(job.getProcessingStatus()).isEqualTo(ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
        assertThat(job.getFailureCount()).isEqualTo(1);
    }

    @Test
    void versionConflictShouldNotCreatePersonOrModifyRow() {
        ImportJobEntity job = correctableJob();
        ImportJobRowEntity row = failedRow();
        when(importJobRepository.findByIdAndClanId(101L, 1L)).thenReturn(Optional.of(job));
        when(importJobRowRepository.findByIdAndJobId(201L, 101L)).thenReturn(Optional.of(row));

        assertThatThrownBy(() -> service.retryPersonRow(
                1L, 101L, 201L, request("李四", "male", "1982-01-01", 1L), 9L
        )).isInstanceOf(BusinessException.class)
                .hasMessage("该行已被其他用户修改，请刷新后重试");

        verify(personRepository, never()).save(any(PersonEntity.class));
        verify(importJobRowRepository, never()).saveAndFlush(any(ImportJobRowEntity.class));
    }

    @Test
    void pendingReviewJobShouldRejectFurtherCorrection() {
        ImportJobEntity job = correctableJob();
        job.setReviewStatus(ImportJobEntity.REVIEW_PENDING);
        when(importJobRepository.findByIdAndClanId(101L, 1L)).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> service.retryPersonRow(
                1L, 101L, 201L, request("李四", "male", "1982-01-01", 0L), 9L
        )).isInstanceOf(BusinessException.class)
                .hasMessage("导入批次已进入审核流程，不能继续修正");

        verify(importJobRowRepository, never()).findByIdAndJobId(anyLong(), anyLong());
    }

    private ImportJobEntity correctableJob() {
        ImportJobEntity job = new ImportJobEntity();
        job.setId(101L);
        job.setClanId(1L);
        job.setBranchId(5L);
        job.setImportType(ImportJobEntity.TYPE_PERSON);
        job.setFileFormat(ImportJobEntity.FORMAT_CSV);
        job.setStatus("partial_completed");
        job.setProcessingStatus(ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
        job.setReviewStatus(ImportJobEntity.REVIEW_NOT_SUBMITTED);
        job.setReviewRound(0);
        job.setTotalCount(2);
        job.setSuccessCount(1);
        job.setFailureCount(1);
        job.setCreatedAt(LocalDateTime.now().minusMinutes(10));
        job.setUpdatedAt(LocalDateTime.now().minusMinutes(5));
        return job;
    }

    private ImportJobRowEntity failedRow() {
        ImportJobRowEntity row = new ImportJobRowEntity();
        row.setId(201L);
        row.setJobId(101L);
        row.setRowNo(3);
        row.setRawData("李四,male,六,明,1982-01-01,是");
        row.setNormalizedData(Map.of("name", "", "gender", ""));
        row.setRowStatus(ImportJobRowEntity.STATUS_INVALID);
        row.setErrorCode("IMPORT_ROW_INVALID");
        row.setErrorMessage("代次必须是数字");
        row.setRetryCount(0);
        row.setVersion(0L);
        row.setCreatedAt(LocalDateTime.now().minusMinutes(5));
        row.setUpdatedAt(LocalDateTime.now().minusMinutes(5));
        return row;
    }

    private PersonImportRowRetryRequest request(String name, String gender, String birthDate, Long expectedVersion) {
        return new PersonImportRowRetryRequest(name, gender, 6, "明", birthDate, true, false, expectedVersion);
    }
}
