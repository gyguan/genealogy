package com.genealogy.imports.application;

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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImportJobExecutionCoordinatorServiceTest {

    @Mock
    private ImportJobRepository jobRepository;
    @Mock
    private ImportJobPayloadRepository payloadRepository;

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
        assertThat(job.getExecutionStatus()).isEqualTo(ImportJobEntity.EXECUTION_RUNNING);
        assertThat(job.getLeaseOwner()).isEqualTo(claim.owner());
        assertThat(job.getLeaseExpiresAt()).isAfter(job.getHeartbeatAt());
        verify(jobRepository).save(job);
    }

    @Test
    void recordFailureShouldMoveToDeadLetterAtRetryLimit() {
        ImportJobEntity job = job(10L, ImportJobEntity.EXECUTION_RUNNING, ImportJobEntity.STAGE_PUBLISHING);
        job.setLeaseOwner("worker-1");
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
    void cancellationAtSafePointShouldNotRequirePayloadToExist() {
        ImportJobEntity job = job(10L, ImportJobEntity.EXECUTION_QUEUED, ImportJobEntity.STAGE_PUBLISHING);
        job.setRequestedAction(ImportJobEntity.ACTION_CANCEL);
        when(jobRepository.findNextExecutableForUpdate(any(LocalDateTime.class))).thenReturn(Optional.of(job));
        when(payloadRepository.existsById(10L)).thenReturn(false);

        assertThat(service.claimNext()).isEmpty();

        assertThat(job.getExecutionStatus()).isEqualTo(ImportJobEntity.EXECUTION_CANCELLED);
        assertThat(job.getExecutionStage()).isEqualTo(ImportJobEntity.STAGE_CANCELLED);
        verify(payloadRepository, never()).deleteById(10L);
        verify(jobRepository).save(job);
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
