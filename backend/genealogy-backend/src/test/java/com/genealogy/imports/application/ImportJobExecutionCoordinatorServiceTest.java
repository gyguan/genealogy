package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.config.ImportExecutionProperties;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.repository.ImportJobPayloadRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImportJobExecutionCoordinatorServiceTest {

    @Mock private ImportJobRepository jobRepository;
    @Mock private ImportJobPayloadRepository payloadRepository;

    private ImportExecutionProperties properties;
    private ImportJobExecutionCoordinatorService service;

    @BeforeEach
    void setUp() {
        properties = new ImportExecutionProperties();
        properties.setLeaseSeconds(45);
        properties.setMaxRetries(3);
        service = new ImportJobExecutionCoordinatorService(jobRepository, payloadRepository, properties);
    }

    @Test
    void claimShouldAssignLeaseAndStartQueuedJob() {
        ImportJobEntity job = job(10L, ImportJobEntity.EXECUTION_QUEUED, ImportJobEntity.STAGE_DRAFTING);
        when(jobRepository.findNextExecutableForUpdate(any(LocalDateTime.class))).thenReturn(Optional.of(job));

        ImportJobExecutionCoordinatorService.Claim claim = service.claimNext().orElseThrow();

        assertThat(claim.jobId()).isEqualTo(10L);
        assertThat(claim.stage()).isEqualTo(ImportJobEntity.STAGE_DRAFTING);
        assertThat(claim.owner()).isNotBlank();
        assertThat(claim.claimedAt()).isEqualTo(job.getHeartbeatAt());
        assertThat(job.getExecutionStatus()).isEqualTo(ImportJobEntity.EXECUTION_RUNNING);
        assertThat(job.getLeaseOwner()).isEqualTo(claim.owner());
        assertThat(job.getLeaseExpiresAt()).isAfter(job.getHeartbeatAt());
        verify(jobRepository).save(job);
    }

    @Test
    void recordFailureShouldMoveToDeadLetterAtRetryLimit() {
        ImportJobEntity job = activeLease(job(10L, ImportJobEntity.EXECUTION_RUNNING, ImportJobEntity.STAGE_PUBLISHING), "worker-1");
        job.setExecutionRetryCount(2);
        job.setExecutionMaxRetries(3);
        when(jobRepository.findById(10L)).thenReturn(Optional.of(job));

        service.recordFailure(10L, "worker-1", new IllegalStateException("database unavailable"));

        assertThat(job.getExecutionStatus()).isEqualTo(ImportJobEntity.EXECUTION_DEAD_LETTER);
        assertThat(job.getExecutionStage()).isEqualTo(ImportJobEntity.STAGE_FAILED);
        assertThat(job.getFailureStage()).isEqualTo(ImportJobEntity.STAGE_PUBLISHING);
        assertThat(job.getExecutionRetryCount()).isEqualTo(3);
        assertThat(job.getManualInterventionRequired()).isTrue();
        assertThat(job.getLeaseOwner()).isNull();
        assertThat(job.getErrorSummary()).isEqualTo("database unavailable");
        verify(jobRepository).save(job);
    }

    @Test
    void wrongLeaseOwnerCannotReleaseJob() {
        ImportJobEntity job = activeLease(job(10L, ImportJobEntity.EXECUTION_RUNNING, ImportJobEntity.STAGE_DRAFTING), "worker-1");
        when(jobRepository.findById(10L)).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> service.release(10L, "worker-2"))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo("IMPORT_JOB_LEASE_OWNER_MISMATCH");

        verify(jobRepository, never()).save(any());
        assertThat(job.getExecutionStatus()).isEqualTo(ImportJobEntity.EXECUTION_RUNNING);
    }

    @Test
    void expiredLeaseCannotSubmitFailureResult() {
        ImportJobEntity job = activeLease(job(10L, ImportJobEntity.EXECUTION_RUNNING, ImportJobEntity.STAGE_DRAFTING), "worker-1");
        job.setLeaseExpiresAt(LocalDateTime.now().minusSeconds(1));
        when(jobRepository.findById(10L)).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> service.recordFailure(10L, "worker-1", new IllegalStateException("late")))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo("IMPORT_JOB_LEASE_EXPIRED");

        verify(jobRepository, never()).save(any());
        assertThat(job.getExecutionRetryCount()).isZero();
    }

    @Test
    void cancellationAtSafePointShouldNotRequirePayloadToExist() {
        ImportJobEntity job = job(10L, ImportJobEntity.EXECUTION_QUEUED, ImportJobEntity.STAGE_PARSING);
        job.setRequestedAction(ImportJobEntity.ACTION_CANCEL);
        when(jobRepository.findNextExecutableForUpdate(any(LocalDateTime.class))).thenReturn(Optional.of(job));
        when(payloadRepository.existsById(10L)).thenReturn(false);

        assertThat(service.claimNext()).isEmpty();

        assertThat(job.getExecutionStatus()).isEqualTo(ImportJobEntity.EXECUTION_CANCELLED);
        assertThat(job.getExecutionStage()).isEqualTo(ImportJobEntity.STAGE_CANCELLED);
        verify(payloadRepository, never()).deleteById(10L);
        verify(jobRepository).save(job);
    }

    @Test
    void cancellationAtSafePointShouldPreserveCommittedChunksAsPartialCancelled() {
        ImportJobEntity job = job(10L, ImportJobEntity.EXECUTION_QUEUED, ImportJobEntity.STAGE_DRAFTING);
        job.setProcessedCount(100);
        job.setCursorRowNo(101);
        job.setRequestedAction(ImportJobEntity.ACTION_CANCEL);
        when(jobRepository.findNextExecutableForUpdate(any(LocalDateTime.class))).thenReturn(Optional.of(job));
        when(payloadRepository.existsById(10L)).thenReturn(true);

        assertThat(service.claimNext()).isEmpty();

        assertThat(job.getExecutionStatus()).isEqualTo(ImportJobEntity.EXECUTION_PARTIAL_CANCELLED);
        assertThat(job.getExecutionStage()).isEqualTo(ImportJobEntity.STAGE_CANCELLED);
        assertThat(job.getRequestedAction()).isNull();
        assertThat(job.getProcessedCount()).isEqualTo(100);
        assertThat(job.getCursorRowNo()).isEqualTo(101);
        verify(payloadRepository).deleteById(10L);
        verify(jobRepository).save(job);
    }

    private ImportJobEntity activeLease(ImportJobEntity job, String owner) {
        job.setLeaseOwner(owner);
        job.setLeaseExpiresAt(LocalDateTime.now().plusMinutes(1));
        job.setHeartbeatAt(LocalDateTime.now());
        return job;
    }

    private ImportJobEntity job(Long id, String status, String stage) {
        ImportJobEntity job = new ImportJobEntity();
        job.setId(id);
        job.setImportType("person_csv");
        job.setOriginalFilename("persons.csv");
        job.setExecutionMode(ImportJobEntity.EXECUTION_MODE_ASYNC);
        job.setExecutionStatus(status);
        job.setExecutionStage(stage);
        job.setExecutionRetryCount(0);
        job.setExecutionMaxRetries(3);
        job.setChunkSize(100);
        job.setProcessedCount(0);
        job.setPublishedCount(0);
        job.setCursorRowNo(0);
        job.setManualInterventionRequired(false);
        job.setCreatedAt(LocalDateTime.now().minusMinutes(1));
        job.setUpdatedAt(LocalDateTime.now().minusMinutes(1));
        return job;
    }
}
