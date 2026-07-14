package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobExecutionResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.repository.ImportJobPayloadRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class ImportJobExecutionApplicationService {

    private final ImportJobRepository jobRepository;
    private final ImportJobPayloadRepository payloadRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;

    public ImportJobExecutionApplicationService(
            ImportJobRepository jobRepository,
            ImportJobPayloadRepository payloadRepository,
            AuthorizationApplicationService authorizationApplicationService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.jobRepository = jobRepository;
        this.payloadRepository = payloadRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
    }

    @Transactional(readOnly = true)
    public ImportJobExecutionResponse get(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = requireJob(clanId, jobId, actorId);
        return toResponse(job);
    }

    @Transactional
    public ImportJobExecutionResponse pause(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = requireAsyncJob(clanId, jobId, actorId);
        String status = job.getExecutionStatus();
        if (ImportJobEntity.EXECUTION_PAUSED.equals(status)) return toResponse(job);
        if (!List.of(ImportJobEntity.EXECUTION_QUEUED, ImportJobEntity.EXECUTION_RUNNING,
                ImportJobEntity.EXECUTION_RETRY_WAIT).contains(status)) {
            throw new BusinessException("IMPORT_JOB_PAUSE_NOT_ALLOWED", "当前任务状态不能暂停");
        }
        LocalDateTime now = LocalDateTime.now();
        if (ImportJobEntity.EXECUTION_RUNNING.equals(status)) {
            job.setRequestedAction(ImportJobEntity.ACTION_PAUSE);
        } else {
            job.setExecutionStatus(ImportJobEntity.EXECUTION_PAUSED);
            job.setRequestedAction(null);
            job.setNextRetryAt(null);
        }
        job.setUpdatedAt(now);
        jobRepository.save(job);
        record(job, actorId, "import_job_pause", "暂停导入任务");
        return toResponse(job);
    }

    @Transactional
    public ImportJobExecutionResponse resume(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = requireAsyncJob(clanId, jobId, actorId);
        if (!ImportJobEntity.EXECUTION_PAUSED.equals(job.getExecutionStatus())) {
            throw new BusinessException("IMPORT_JOB_RESUME_NOT_ALLOWED", "只有已暂停任务可以继续");
        }
        LocalDateTime now = LocalDateTime.now();
        job.setExecutionStatus(ImportJobEntity.EXECUTION_QUEUED);
        job.setRequestedAction(null);
        job.setNextRetryAt(null);
        job.setLeaseOwner(null);
        job.setLeaseExpiresAt(null);
        job.setUpdatedAt(now);
        jobRepository.save(job);
        record(job, actorId, "import_job_resume", "继续导入任务");
        return toResponse(job);
    }

    @Transactional
    public ImportJobExecutionResponse cancel(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = requireAsyncJob(clanId, jobId, actorId);
        String status = job.getExecutionStatus();
        if (List.of(ImportJobEntity.EXECUTION_COMPLETED, ImportJobEntity.EXECUTION_CANCELLED).contains(status)) {
            throw new BusinessException("IMPORT_JOB_CANCEL_NOT_ALLOWED", "已完成或已取消任务不能再次取消");
        }
        LocalDateTime now = LocalDateTime.now();
        if (ImportJobEntity.EXECUTION_RUNNING.equals(status)) {
            job.setRequestedAction(ImportJobEntity.ACTION_CANCEL);
        } else {
            job.setExecutionStatus(ImportJobEntity.EXECUTION_CANCELLED);
            job.setExecutionStage(ImportJobEntity.STAGE_CANCELLED);
            job.setRequestedAction(null);
            job.setCompletedAt(now);
            job.setLeaseOwner(null);
            job.setLeaseExpiresAt(null);
            payloadRepository.deleteById(jobId);
        }
        job.setUpdatedAt(now);
        jobRepository.save(job);
        record(job, actorId, "import_job_cancel", "取消导入任务");
        return toResponse(job);
    }

    @Transactional
    public ImportJobExecutionResponse retry(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = requireAsyncJob(clanId, jobId, actorId);
        if (!List.of(ImportJobEntity.EXECUTION_FAILED, ImportJobEntity.EXECUTION_DEAD_LETTER)
                .contains(job.getExecutionStatus())) {
            throw new BusinessException("IMPORT_JOB_RETRY_NOT_ALLOWED", "只有失败或待人工介入任务可以重试");
        }
        if (!ImportJobEntity.STAGE_PUBLISHING.equals(job.getFailureStage()) && !payloadRepository.existsById(jobId)) {
            throw new BusinessException("IMPORT_JOB_PAYLOAD_NOT_FOUND", "原始文件已不存在，无法恢复解析，请重新上传");
        }
        LocalDateTime now = LocalDateTime.now();
        String resumeStage = normalizeStage(job.getFailureStage());
        job.setExecutionStage(resumeStage);
        job.setExecutionStatus(ImportJobEntity.EXECUTION_QUEUED);
        job.setExecutionRetryCount(0);
        job.setRequestedAction(null);
        job.setFailureStage(null);
        job.setLastErrorCode(null);
        job.setErrorSummary(null);
        job.setNextRetryAt(null);
        job.setManualInterventionRequired(false);
        job.setCompletedAt(null);
        job.setLeaseOwner(null);
        job.setLeaseExpiresAt(null);
        job.setUpdatedAt(now);
        jobRepository.save(job);
        record(job, actorId, "import_job_retry", "重试导入任务");
        return toResponse(job);
    }

    private ImportJobEntity requireAsyncJob(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = requireJob(clanId, jobId, actorId);
        if (!job.isAsyncExecution()) {
            throw new BusinessException("IMPORT_JOB_NOT_ASYNC", "当前任务不是异步任务");
        }
        return job;
    }

    private ImportJobEntity requireJob(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = jobRepository.findByIdAndClanId(jobId, clanId)
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_NOT_FOUND", "导入任务不存在"));
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, job.getBranchId());
        return job;
    }

    private ImportJobExecutionResponse toResponse(ImportJobEntity job) {
        int total = value(job.getTotalCount());
        int progress = ImportJobEntity.STAGE_PUBLISHING.equals(job.getExecutionStage())
                ? value(job.getPublishedCount())
                : value(job.getProcessedCount());
        int denominator = ImportJobEntity.STAGE_PUBLISHING.equals(job.getExecutionStage())
                ? Math.max(0, value(job.getSuccessCount()))
                : total;
        int remaining = Math.max(0, denominator - progress);
        int percent = denominator <= 0 ? 0 : Math.min(100, (int) Math.round(progress * 100.0d / denominator));
        if (ImportJobEntity.EXECUTION_COMPLETED.equals(job.getExecutionStatus())) percent = 100;
        return new ImportJobExecutionResponse(
                job.getId(), job.getExecutionMode(), job.getExecutionStatus(), job.getExecutionStage(),
                job.getTotalCount(), job.getProcessedCount(), job.getPublishedCount(), remaining, percent,
                job.getCursorRowNo(), job.getChunkSize(), job.getExecutionRetryCount(), job.getExecutionMaxRetries(),
                job.getFailureStage(), job.getLastErrorCode(), job.getErrorSummary(),
                Boolean.TRUE.equals(job.getManualInterventionRequired()), job.getNextRetryAt(), job.getStartedAt(),
                job.getCompletedAt(), job.getHeartbeatAt(), allowedActions(job)
        );
    }

    private List<String> allowedActions(ImportJobEntity job) {
        if (!job.isAsyncExecution()) return List.of();
        String status = job.getExecutionStatus();
        List<String> actions = new ArrayList<>();
        if (List.of(ImportJobEntity.EXECUTION_QUEUED, ImportJobEntity.EXECUTION_RUNNING,
                ImportJobEntity.EXECUTION_RETRY_WAIT).contains(status)) {
            actions.add("pause");
            actions.add("cancel");
        } else if (ImportJobEntity.EXECUTION_PAUSED.equals(status)) {
            actions.add("resume");
            actions.add("cancel");
        } else if (List.of(ImportJobEntity.EXECUTION_FAILED, ImportJobEntity.EXECUTION_DEAD_LETTER).contains(status)) {
            actions.add("retry");
            actions.add("cancel");
        }
        return List.copyOf(actions);
    }

    private String normalizeStage(String failureStage) {
        if (ImportJobEntity.STAGE_PUBLISHING.equals(failureStage)) return ImportJobEntity.STAGE_PUBLISHING;
        if (ImportJobEntity.STAGE_DRAFTING.equals(failureStage)) return ImportJobEntity.STAGE_DRAFTING;
        return ImportJobEntity.STAGE_PARSING;
    }

    private void record(ImportJobEntity job, Long actorId, String action, String summary) {
        operationLogApplicationService.record(
                job.getClanId(), actorId, action, "import_job", job.getId(), summary,
                "executionStatus=" + job.getExecutionStatus() + ", executionStage=" + job.getExecutionStage()
        );
    }

    private int value(Integer value) {
        return value == null ? 0 : value;
    }
}
