package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobRowResponse;
import com.genealogy.imports.dto.PersonImportRowRetryRequest;
import com.genealogy.imports.entity.ImportJobEntity;
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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImportJobRowApplicationServiceTest {

    @Mock ImportJobRepository importJobRepository;
    @Mock ImportJobRowRepository importJobRowRepository;
    @Mock ImportJobErrorRepository importJobErrorRepository;
    @Mock PersonRepository personRepository;
    @Mock AuthorizationApplicationService authorizationApplicationService;
    @Mock OperationLogApplicationService operationLogApplicationService;

    private ImportJobRowApplicationService service;
    private ImportJobEntity job;
    private ImportJobRowEntity row;

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
        job = new ImportJobEntity();
        job.setId(10L);
        job.setClanId(1L);
        job.setBranchId(2L);
        job.setImportType(ImportJobEntity.TYPE_PERSON);
        job.setProcessingStatus(ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
        job.setReviewStatus(ImportJobEntity.REVIEW_NOT_SUBMITTED);
        row = new ImportJobRowEntity();
        row.setId(100L);
        row.setJobId(10L);
        row.setRowNo(3);
        row.setRowStatus(ImportJobRowEntity.STATUS_INVALID);
        row.setRetryCount(1);
        row.setVersion(2L);
        row.setRawData(Map.of("姓名", ""));

        when(importJobRepository.findByIdAndClanId(10L, 1L)).thenReturn(Optional.of(job));
        when(importJobRowRepository.findByIdAndJobId(100L, 10L)).thenReturn(Optional.of(row));
        when(importJobRowRepository.saveAndFlush(any(ImportJobRowEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(importJobRepository.save(any(ImportJobEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(personRepository.countDuplicates(
                anyLong(), nullable(Long.class), anyString(), nullable(Integer.class),
                nullable(String.class), nullable(java.time.LocalDate.class)
        )).thenReturn(0L);
        when(personRepository.save(any(PersonEntity.class))).thenAnswer(invocation -> {
            PersonEntity entity = invocation.getArgument(0);
            entity.setId(500L);
            return entity;
        });
        when(importJobRowRepository.countByJobId(10L)).thenReturn(1L);
        when(importJobRowRepository.countByJobIdAndRowStatus(10L, ImportJobRowEntity.STATUS_DRAFT_CREATED)).thenReturn(1L);
        when(importJobRowRepository.countByJobIdAndRowStatusIn(10L, Set.of(ImportJobRowEntity.STATUS_INVALID, ImportJobRowEntity.STATUS_RETRY_FAILED))).thenReturn(0L);
    }

    @Test
    void retryShouldCreateDraftAndRecalculateJob() {
        PersonImportRowRetryRequest request = new PersonImportRowRetryRequest(
                "张三", "male", 5, "德,", "1980-01-01", true, true, 2L
        );

        ImportJobRowResponse response = service.retryPersonRow(1L, 10L, 100L, request, 9L);

        assertThat(response.rowStatus()).isEqualTo(ImportJobRowEntity.STATUS_DRAFT_CREATED);
        assertThat(response.hasDraft()).isTrue();
        assertThat(row.getRetryCount()).isEqualTo(2);
        assertThat(row.getDraftTargetId()).isEqualTo(500L);
        assertThat(job.getProcessingStatus()).isEqualTo(ImportJobEntity.PROCESSING_READY_FOR_REVIEW);
        verify(importJobErrorRepository).deleteByJobIdAndRowNo(10L, 3);
    }

    @Test
    void versionConflictShouldBlockRetry() {
        PersonImportRowRetryRequest request = new PersonImportRowRetryRequest(
                "张三", "male", 5, "德", "1980-01-01", true, true, 1L
        );

        assertThatThrownBy(() -> service.retryPersonRow(1L, 10L, 100L, request, 9L))
                .isInstanceOf(BusinessException.class)
                .extracting(exception -> ((BusinessException) exception).getCode())
                .isEqualTo("IMPORT_JOB_ROW_VERSION_CONFLICT");
    }
}
