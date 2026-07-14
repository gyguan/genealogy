package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.imports.dto.ImportJobExecutionResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.repository.ImportJobPayloadRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImportJobExecutionApplicationServiceTest {

    @Mock
    private ImportJobRepository jobRepository;
    @Mock
    private ImportJobPayloadRepository payloadRepository;
    @Mock
    private AuthorizationApplicationService authorizationApplicationService;
    @Mock
    private OperationLogApplicationService operationLogApplicationService;

    private ImportJobExecutionApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ImportJobExecutionApplicationService(
                jobRepository,
                payloadRepository,
                authorizationApplicationService,
                operationLogApplicationService
        );
    }

    @Test
    void pauseRunningJobShouldRequestSafePointPause() {
        ImportJobEntity job = job(ImportJobEntity.EXECUTION_RUNNING, ImportJobEntity.STAGE_DRAFTING);
        when(jobRepository.findByIdAndClanId(10L, 1L)).thenReturn(Optional.of(job));

        ImportJobExecutionResponse response = service.pause(1L, 10L, 9L);

        assertThat(job.getExecutionStatus()).isEqualTo(ImportJobEntity.EXECUTION_RUNNING);
        assertThat(job.getRequestedAction()).isEqualTo(ImportJobEntity.ACTION_PAUSE);
        assertThat(response.allowedActions()).containsExactly("pause", "cancel");
        verify(authorizationApplicationService).requireBranchWriteScope(1L, 9L, 2L);
        verify(jobRepository).save(job);
    }

    @Test
    void resumeShouldRequeuePausedJobAndClearLease() {
        ImportJobEntity job = job(ImportJobEntity.EXECUTION_PAUSED, ImportJobEntity.STAGE_DRAFTING);
        job.setLeaseOwner("stale-worker");
        job.setLeaseExpiresAt(LocalDateTime.now().plusMinutes(1));
        when(jobRepository.findByIdAndClanId(10L, 1L)).thenReturn(Optional.of(job));

        ImportJobExecutionResponse response = service.resume(1L, 10L, 9L);

        assertThat(response.executionStatus()).isEqualTo(ImportJobEntity.EXECUTION_QUEUED);
        assertThat(job.getLeaseOwner()).isNull();
        assertThat(job.getLeaseExpiresAt()).isNull();
        assertThat(response.allowedActions()).containsExactly("pause", "cancel");
    }

    @Test
    void retryPublishingDeadLetterShouldNotNeedOriginalPayload() {
        ImportJobEntity job = job(ImportJobEntity.EXECUTION_DEAD_LETTER, ImportJobEntity.STAGE_FAILED);
        job.setFailureStage(ImportJobEntity.STAGE_PUBLISHING);
        job.setManualInterventionRequired(true);
        job.setExecutionRetryCount(3);
        when(jobRepository.findByIdAndClanId(10L, 1L)).thenReturn(Optional.of(job));

        ImportJobExecutionResponse response = service.retry(1L, 10L, 9L);

        assertThat(response.executionStatus()).isEqualTo(ImportJobEntity.EXECUTION_QUEUED);
        assertThat(response.executionStage()).isEqualTo(ImportJobEntity.STAGE_PUBLISHING);
        assertThat(response.manualInterventionRequired()).isFalse();
        assertThat(response.retryCount()).isZero();
        verify(payloadRepository, never()).existsById(10L);
    }

    @Test
    void cancelPausedPublishingJobShouldSucceedWithoutPayload() {
        ImportJobEntity job = job(ImportJobEntity.EXECUTION_PAUSED, ImportJobEntity.STAGE_PUBLISHING);
        when(jobRepository.findByIdAndClanId(10L, 1L)).thenReturn(Optional.of(job));
        when(payloadRepository.existsById(10L)).thenReturn(false);

        ImportJobExecutionResponse response = service.cancel(1L, 10L, 9L);

        assertThat(response.executionStatus()).isEqualTo(ImportJobEntity.EXECUTION_CANCELLED);
        assertThat(response.executionStage()).isEqualTo(ImportJobEntity.STAGE_CANCELLED);
        verify(payloadRepository, never()).deleteById(10L);
    }

    private ImportJobEntity job(String status, String stage) {
        ImportJobEntity job = new ImportJobEntity();
        job.setId(10L);
        job.setClanId(1L);
        job.setBranchId(2L);
        job.setImportType("person_csv");
        job.setOriginalFilename("persons.csv");
        job.setExecutionMode(ImportJobEntity.EXECUTION_MODE_ASYNC);
        job.setExecutionStatus(status);
        job.setExecutionStage(stage);
        job.setTotalCount(1000);
        job.setSuccessCount(700);
        job.setFailureCount(0);
        job.setProcessedCount(600);
        job.setPublishedCount(200);
        job.setCursorRowNo(601);
        job.setChunkSize(100);
        job.setExecutionRetryCount(0);
        job.setExecutionMaxRetries(3);
        job.setManualInterventionRequired(false);
        job.setCreatedAt(LocalDateTime.now().minusMinutes(5));
        job.setUpdatedAt(LocalDateTime.now().minusMinutes(1));
        return job;
    }
}
