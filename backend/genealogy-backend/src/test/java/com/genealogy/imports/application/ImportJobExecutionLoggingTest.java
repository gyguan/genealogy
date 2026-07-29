package com.genealogy.imports.application;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.genealogy.imports.config.ImportExecutionProperties;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.repository.ImportJobPayloadRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ImportJobExecutionLoggingTest {

    private final ImportJobRepository jobRepository = mock(ImportJobRepository.class);
    private final ImportJobPayloadRepository payloadRepository = mock(ImportJobPayloadRepository.class);
    private final Logger logger = (Logger) LoggerFactory.getLogger(ImportJobExecutionCoordinatorService.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();
    private ImportJobExecutionCoordinatorService service;

    @BeforeEach
    void setUp() {
        ImportExecutionProperties properties = new ImportExecutionProperties();
        properties.setLeaseSeconds(45);
        properties.setMaxRetries(3);
        properties.setChunkSize(100);
        service = new ImportJobExecutionCoordinatorService(jobRepository, payloadRepository, properties);
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        logger.detachAppender(appender);
        appender.stop();
    }

    @Test
    void claimAndReleaseEmitBatchBoundaryEventsWithoutFullOwner() {
        ImportJobEntity job = job(10L, ImportJobEntity.EXECUTION_QUEUED, ImportJobEntity.STAGE_DRAFTING);
        when(jobRepository.findNextExecutableForUpdate(any(LocalDateTime.class))).thenReturn(Optional.of(job));
        when(jobRepository.findById(10L)).thenReturn(Optional.of(job));

        ImportJobExecutionCoordinatorService.Claim claim = service.claimNext().orElseThrow();
        job.setProcessedCount(100);
        job.setSuccessCount(98);
        job.setFailureCount(1);
        job.setSkippedCount(1);
        job.setCursorRowNo(101);
        service.release(10L, claim.owner());

        List<String> messages = messages();
        assertThat(messages).anyMatch(value -> value.contains("event=import_job_claimed"));
        assertThat(messages).anyMatch(value -> value.contains("event=import_chunk_started") && value.contains("rowStart=0") && value.contains("rowEnd=99"));
        assertThat(messages).anyMatch(value -> value.contains("event=import_chunk_completed") && value.contains("successCount=98") && value.contains("failureCount=1") && value.contains("skippedCount=1"));
        assertThat(messages).noneMatch(value -> value.contains(claim.owner()));
    }

    @Test
    void recoverableFailureUsesWarnAndTerminalFailureUsesErrorWithStackTrace() {
        ImportJobEntity retryJob = job(11L, ImportJobEntity.EXECUTION_RUNNING, ImportJobEntity.STAGE_PARSING);
        retryJob.setLeaseOwner("worker-retry");
        retryJob.setExecutionRetryCount(0);
        when(jobRepository.findById(11L)).thenReturn(Optional.of(retryJob));

        service.recordFailure(11L, "worker-retry", new IllegalStateException("temporary failure"));

        assertThat(appender.list).anySatisfy(event -> {
            assertThat(event.getLevel()).isEqualTo(Level.WARN);
            assertThat(event.getFormattedMessage()).contains("event=import_job_retry_scheduled");
        });

        ImportJobEntity terminalJob = job(12L, ImportJobEntity.EXECUTION_RUNNING, ImportJobEntity.STAGE_PUBLISHING);
        terminalJob.setLeaseOwner("worker-terminal");
        terminalJob.setExecutionRetryCount(2);
        terminalJob.setExecutionMaxRetries(3);
        when(jobRepository.findById(12L)).thenReturn(Optional.of(terminalJob));

        service.recordFailure(12L, "worker-terminal", new IllegalStateException("terminal failure"));

        assertThat(appender.list).anySatisfy(event -> {
            assertThat(event.getLevel()).isEqualTo(Level.ERROR);
            assertThat(event.getFormattedMessage()).contains("event=import_job_terminal_failure")
                    .contains("toStatus=dead_letter");
            assertThat(event.getThrowableProxy()).isNotNull();
        });
    }

    @Test
    void safePointPauseAndPartialCancellationEmitExplicitTransitions() {
        ImportJobEntity paused = job(13L, ImportJobEntity.EXECUTION_QUEUED, ImportJobEntity.STAGE_DRAFTING);
        paused.setRequestedAction(ImportJobEntity.ACTION_PAUSE);
        when(jobRepository.findNextExecutableForUpdate(any(LocalDateTime.class))).thenReturn(Optional.of(paused));
        assertThat(service.claimNext()).isEmpty();

        ImportJobEntity cancelled = job(14L, ImportJobEntity.EXECUTION_QUEUED, ImportJobEntity.STAGE_DRAFTING);
        cancelled.setProcessedCount(20);
        cancelled.setRequestedAction(ImportJobEntity.ACTION_CANCEL);
        when(jobRepository.findNextExecutableForUpdate(any(LocalDateTime.class))).thenReturn(Optional.of(cancelled));
        when(payloadRepository.existsById(14L)).thenReturn(false);
        assertThat(service.claimNext()).isEmpty();

        assertThat(messages()).anyMatch(value -> value.contains("event=import_job_paused") && value.contains("toStatus=paused"));
        assertThat(messages()).anyMatch(value -> value.contains("event=import_job_partial_cancelled") && value.contains("toStatus=partial_cancelled"));
    }

    private List<String> messages() {
        return appender.list.stream().map(ILoggingEvent::getFormattedMessage).toList();
    }

    private ImportJobEntity job(Long id, String status, String stage) {
        ImportJobEntity job = new ImportJobEntity();
        job.setId(id);
        job.setClanId(1L);
        job.setBranchId(2L);
        job.setExecutionMode(ImportJobEntity.EXECUTION_MODE_ASYNC);
        job.setExecutionStatus(status);
        job.setExecutionStage(stage);
        job.setExecutionRetryCount(0);
        job.setExecutionMaxRetries(3);
        job.setChunkSize(100);
        job.setProcessedCount(0);
        job.setPublishedCount(0);
        job.setSuccessCount(0);
        job.setFailureCount(0);
        job.setSkippedCount(0);
        job.setCursorRowNo(0);
        job.setCreatedAt(LocalDateTime.now().minusMinutes(1));
        job.setUpdatedAt(LocalDateTime.now().minusMinutes(1));
        return job;
    }
}
