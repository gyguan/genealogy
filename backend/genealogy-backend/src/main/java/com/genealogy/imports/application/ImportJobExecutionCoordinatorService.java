package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.config.ImportExecutionProperties;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.repository.ImportJobPayloadRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
public class ImportJobExecutionCoordinatorService {

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
        String owner = UUID.randomUUID().toString();
        job.setExecutionStatus(ImportJobEntity.EXECUTION_RUNNING);
        job.setLeaseOwner(owner);
        job.setLeaseExpiresAt(now.plusSeconds(properties.getLeaseSeconds()));
        job.setHeartbeatAt(now);
        if (job.getStartedAt() == null) job.setStartedAt(now);
        job.setUpdatedAt(now);
        jobRepository.save(job);
        return Optional.of(new Claim(job.getId(), owner, job.getExecutionStage()));
    }

    @Transactional
    public void release(Long jobId, String owner) {
        jobRepository.findById(jobId).ifPresent(job -> {
            if (!Objects.equals(owner, job.getLeaseOwner())) return;
            if (ImportJobEntity.EXECUTION_RUNNING.equals(job.getExecutionStatus())) {
                job.setExecutionStatus(ImportJobEntity.EXECUTION_QUEUED);
            }
            job.setLeaseOwner(null);
            job.setLeaseExpiresAt(null);
            LocalDateTime now = LocalDateTime.now();
            job.setHeartbeatAt(now);
            job.setUpdatedAt(now);
            jobRepository.save(job);
        });
    }

    @Transactional
    public void recordFailure(Long jobId, String owner, RuntimeException exception) {
        ImportJobEntity job = jobRepository.findById(jobId).orElse(null);
        if (job == null || !Objects.equals(owner, job.getLeaseOwner())) return;
        int retryCount = value(job.getExecutionRetryCount()) + 1;
        int maxRetries = Math.max(1, value(job.getExecutionMaxRetries(), properties.getMaxRetries()));
        LocalDateTime now = LocalDateTime.now();
        String message = safeMessage(exception);
        job.setExecutionRetryCount(retryCount);
        job.setFailureStage(job.getExecutionStage());
        job.setLastErrorCode(errorCode(exception));
        job.setErrorSummary(message);
        job.setLeaseOwner(null);
        job.setLeaseExpiresAt(null);
        job.setHeartbeatAt(now);
        job.setUpdatedAt(now);
        if (retryCount >= maxRetries) {
            job.setExecutionStatus(ImportJobEntity.EXECUTION_DEAD_LETTER);
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
    }

    private void pauseAtSafePoint(ImportJobEntity job, LocalDateTime now) {
        job.setRequestedAction(null);
        job.setExecutionStatus(ImportJobEntity.EXECUTION_PAUSED);
        job.setLeaseOwner(null);
        job.setLeaseExpiresAt(null);
        job.setHeartbeatAt(now);
        job.setUpdatedAt(now);
        jobRepository.save(job);
    }

    private void cancelAtSafePoint(ImportJobEntity job, LocalDateTime now) {
        if (hasSideEffects(job)) {
            job.setRequestedAction(null);
            job.setExecutionStatus(ImportJobEntity.EXECUTION_PAUSED);
            job.setErrorSummary("任务在取消请求生效前已生成草稿或开始发布，已自动转为暂停以保护数据完整性");
            job.setLeaseOwner(null);
            job.setLeaseExpiresAt(null);
            job.setHeartbeatAt(now);
            job.setUpdatedAt(now);
            jobRepository.save(job);
            return;
        }
        job.setRequestedAction(null);
        job.setExecutionStatus(ImportJobEntity.EXECUTION_CANCELLED);
        job.setExecutionStage(ImportJobEntity.STAGE_CANCELLED);
        job.setLeaseOwner(null);
        job.setLeaseExpiresAt(null);
        job.setCompletedAt(now);
        job.setHeartbeatAt(now);
        job.setUpdatedAt(now);
        jobRepository.save(job);
        deletePayloadIfPresent(job.getId());
    }

    private boolean hasSideEffects(ImportJobEntity job) {
        return value(job.getProcessedCount()) > 0 || value(job.getPublishedCount()) > 0;
    }

    private void deletePayloadIfPresent(Long jobId) {
        if (payloadRepository.existsById(jobId)) {
            payloadRepository.deleteById(jobId);
        }
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

    private int value(Integer value) {
        return value == null ? 0 : value;
    }

    private int value(Integer value, int fallback) {
        return value == null ? fallback : value;
    }

    public record Claim(Long jobId, String owner, String stage) {
    }
}
