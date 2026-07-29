package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.config.ImportExecutionProperties;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.repository.ImportJobPayloadRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
public class ImportJobExecutionCoordinatorService {

    private static final Logger log = LoggerFactory.getLogger(ImportJobExecutionCoordinatorService.class);

    private final ImportJobRepository jobRepository;
    private final ImportJobPayloadRepository payloadRepository;
    private final ImportExecutionProperties properties;

    public ImportJobExecutionCoordinatorService(
            ImportJobRepository jobRepository,
            ImportJobPayloadRepository payloadRepository,
            ImportExecutionProperties properties
    ) {
        this.jobRepository = jobRepository;
        this.payloadRepository = payloadRepository;
        this.properties = properties;
    }

    @Transactional
    public Optional<Claim> claimNext() {
        LocalDateTime now = LocalDateTime.now();
        Optional<ImportJobEntity> candidate = jobRepository.findNextExecutableForUpdate(now);
        if (candidate.isEmpty()) return Optional.empty();
        ImportJobEntity job = candidate.get();
        if (ImportJobEntity.ACTION_CANCEL.equals(job.getRequestedAction())) {
            cancelAtSafePoint(job, now);
            return Optional.empty();
        }
        if (ImportJobEntity.ACTION_PAUSE.equals(job.getRequestedAction())) {
            pauseAtSafePoint(job, now);
            return Optional.empty();
        }
        String fromStatus = job.getExecutionStatus();
        String owner = UUID.randomUUID().toString();
        job.setExecutionStatus(ImportJobEntity.EXECUTION_RUNNING);
        job.setLeaseOwner(owner);
        job.setLeaseExpiresAt(now.plusSeconds(properties.getLeaseSeconds()));
        job.setHeartbeatAt(now);
        if (job.getStartedAt() == null) job.setStartedAt(now);
        job.setUpdatedAt(now);
        jobRepository.save(job);
        int rowStart = Math.max(0, value(job.getCursorRowNo()));
        int rowEnd = rowStart + Math.max(1, value(job.getChunkSize(), properties.getChunkSize())) - 1;
        log.info(
                "event=import_job_claimed jobId={} stage={} fromStatus={} toStatus={} cursorRowNo={} processedCount={} publishedCount={} retryCount={} ownerPrefix={} result=success",
                job.getId(), job.getExecutionStage(), fromStatus, job.getExecutionStatus(), job.getCursorRowNo(),
                job.getProcessedCount(), job.getPublishedCount(), job.getExecutionRetryCount(), prefix(owner)
        );
        log.info(
                "event=import_chunk_started jobId={} stage={} rowStart={} rowEnd={} cursorRowNo={} processedCount={} publishedCount={} ownerPrefix={} result=started",
                job.getId(), job.getExecutionStage(), rowStart, rowEnd, job.getCursorRowNo(),
                job.getProcessedCount(), job.getPublishedCount(), prefix(owner)
        );
        return Optional.of(new Claim(job.getId(), owner, job.getExecutionStage()));
    }

    @Transactional
    public void release(Long jobId, String owner) {
        jobRepository.findById(jobId).ifPresent(job -> {
            if (!Objects.equals(owner, job.getLeaseOwner())) return;
            String fromStatus = job.getExecutionStatus();
            LocalDateTime chunkStartedAt = job.getHeartbeatAt();
            if (ImportJobEntity.EXECUTION_RUNNING.equals(job.getExecutionStatus())) {
                job.setExecutionStatus(ImportJobEntity.EXECUTION_QUEUED);
            }
            job.setLeaseOwner(null);
            job.setLeaseExpiresAt(null);
            LocalDateTime now = LocalDateTime.now();
            job.setHeartbeatAt(now);
            job.setUpdatedAt(now);
            jobRepository.save(job);
            long costMs = chunkStartedAt == null ? 0L : Math.max(0L, Duration.between(chunkStartedAt, now).toMillis());
            log.info(
                    "event=import_chunk_completed jobId={} stage={} fromStatus={} toStatus={} cursorRowNo={} successCount={} failureCount={} skippedCount={} processedCount={} publishedCount={} costMs={} result=success",
                    job.getId(), job.getExecutionStage(), fromStatus, job.getExecutionStatus(), job.getCursorRowNo(),
                    job.getSuccessCount(), job.getFailureCount(), job.getSkippedCount(), job.getProcessedCount(),
                    job.getPublishedCount(), costMs
            );
        });
    }

    @Transactional
    public void recordFailure(Long jobId, String owner, RuntimeException exception) {
        ImportJobEntity job = jobRepository.findById(jobId).orElse(null);
        if (job == null || !Objects.equals(owner, job.getLeaseOwner())) return;
        String fromStatus = job.getExecutionStatus();
        int retryCount = value(job.getExecutionRetryCount()) + 1;
        int maxRetries = Math.max(1, value(job.getExecutionMaxRetries(), properties.getMaxRetries()));
        LocalDateTime now = LocalDateTime.now();
        job.setExecutionRetryCount(retryCount);
        job.setFailureStage(job.getExecutionStage());
        job.setLastErrorCode(errorCode(exception));
        job.setErrorSummary(safeMessage(exception));
        job.setLeaseOwner(null);
        job.setLeaseExpiresAt(null);
        job.setHeartbeatAt(now);
        job.setUpdatedAt(now);
        if (retryCount >= maxRetries) {
            boolean partial = value(job.getProcessedCount()) > 0 || value(job.getPublishedCount()) > 0;
            job.setExecutionStatus(partial
                    ? ImportJobEntity.EXECUTION_PARTIAL_FAILED
                    : ImportJobEntity.EXECUTION_DEAD_LETTER);
            job.setExecutionStage(ImportJobEntity.STAGE_FAILED);
            job.setManualInterventionRequired(true);
            job.setCompletedAt(now);
            job.setNextRetryAt(null);
        } else {
            long delaySeconds = Math.min(300L, 5L * (1L << Math.min(6, retryCount - 1)));
            job.setExecutionStatus(ImportJobEntity.EXECUTION_RETRY_WAIT);
            job.setNextRetryAt(now.plusSeconds(delaySeconds));
        }
        jobRepository.save(job);
        if (retryCount >= maxRetries) {
            log.error(
                    "event=import_job_terminal_failure jobId={} stage={} failureStage={} fromStatus={} toStatus={} cursorRowNo={} processedCount={} publishedCount={} retryCount={} maxRetries={} errorCode={} result=failed",
                    job.getId(), job.getExecutionStage(), job.getFailureStage(), fromStatus, job.getExecutionStatus(),
                    job.getCursorRowNo(), job.getProcessedCount(), job.getPublishedCount(), retryCount, maxRetries,
                    job.getLastErrorCode(), exception
            );
        } else {
            log.warn(
                    "event=import_job_retry_scheduled jobId={} stage={} fromStatus={} toStatus={} cursorRowNo={} processedCount={} publishedCount={} retryCount={} maxRetries={} nextRetryAt={} errorCode={} result=retry_wait",
                    job.getId(), job.getFailureStage(), fromStatus, job.getExecutionStatus(), job.getCursorRowNo(),
                    job.getProcessedCount(), job.getPublishedCount(), retryCount, maxRetries, job.getNextRetryAt(),
                    job.getLastErrorCode()
            );
        }
    }

    private void pauseAtSafePoint(ImportJobEntity job, LocalDateTime now) {
        String fromStatus = job.getExecutionStatus();
        job.setRequestedAction(null);
        job.setExecutionStatus(ImportJobEntity.EXECUTION_PAUSED);
        job.setLeaseOwner(null);
        job.setLeaseExpiresAt(null);
        job.setHeartbeatAt(now);
        job.setUpdatedAt(now);
        jobRepository.save(job);
        log.info(
                "event=import_job_paused jobId={} stage={} fromStatus={} toStatus={} cursorRowNo={} processedCount={} publishedCount={} result=success",
                job.getId(), job.getExecutionStage(), fromStatus, job.getExecutionStatus(), job.getCursorRowNo(),
                job.getProcessedCount(), job.getPublishedCount()
        );
    }

    private void cancelAtSafePoint(ImportJobEntity job, LocalDateTime now) {
        String fromStatus = job.getExecutionStatus();
        boolean partial = value(job.getProcessedCount()) > 0 || value(job.getPublishedCount()) > 0;
        job.setRequestedAction(null);
        job.setExecutionStatus(partial
                ? ImportJobEntity.EXECUTION_PARTIAL_CANCELLED
                : ImportJobEntity.EXECUTION_CANCELLED);
        job.setExecutionStage(ImportJobEntity.STAGE_CANCELLED);
        job.setStatus(partial ? "partial_cancelled" : "cancelled");
        job.setLeaseOwner(null);
        job.setLeaseExpiresAt(null);
        job.setCompletedAt(now);
        job.setHeartbeatAt(now);
        job.setUpdatedAt(now);
        jobRepository.save(job);
        deletePayloadIfPresent(job.getId());
        log.info(
                "event={} jobId={} stage={} fromStatus={} toStatus={} cursorRowNo={} processedCount={} publishedCount={} result=success",
                partial ? "import_job_partial_cancelled" : "import_job_cancelled", job.getId(), job.getExecutionStage(),
                fromStatus, job.getExecutionStatus(), job.getCursorRowNo(), job.getProcessedCount(), job.getPublishedCount()
        );
    }

    private void deletePayloadIfPresent(Long jobId) {
        if (payloadRepository.existsById(jobId)) payloadRepository.deleteById(jobId);
    }

    private String errorCode(RuntimeException exception) {
        return exception instanceof BusinessException businessException
                ? businessException.getCode()
                : "IMPORT_EXECUTION_FAILED";
    }

    private String safeMessage(RuntimeException exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) message = "导入后台处理失败";
        message = message.replace('\n', ' ').replace('\r', ' ').trim();
        return message.length() > 1000 ? message.substring(0, 1000) : message;
    }

    private String prefix(String value) {
        if (value == null || value.isBlank()) return "";
        return value.substring(0, Math.min(8, value.length()));
    }

    private int value(Integer value) {
        return value == null ? 0 : value;
    }

    private int value(Integer value, int fallback) {
        return value == null ? fallback : value;
    }

    public record Claim(Long jobId, String owner, String stage) {
    }
}
