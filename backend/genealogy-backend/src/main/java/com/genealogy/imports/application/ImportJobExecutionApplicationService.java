package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.domain.ImportExecutionState;
import com.genealogy.imports.domain.ImportJobStateMachine;
import com.genealogy.imports.dto.ImportJobExecutionResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.repository.ImportJobPayloadRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ImportJobExecutionApplicationService {

    private static final Logger log = LoggerFactory.getLogger(ImportJobExecutionApplicationService.class);

    private final ImportJobRepository jobRepository;
    private final ImportJobPayloadRepository payloadRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;
    private final ImportJobStateMachine stateMachine = new ImportJobStateMachine();

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
        return toResponse(requireJob(clanId, jobId, actorId));
    }

    @Transactional
    public ImportJobExecutionResponse pause(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = requireAsyncJob(clanId, jobId, actorId);
        ImportJobStateMachine.Transition transition = stateMachine.pause(job, LocalDateTime.now());
        jobRepository.save(job);
        record(job, actorId, "import_job_pause", "暂停导入任务");
        log.info(
                "event=import_job_pause_requested jobId={} stage={} fromStatus={} toStatus={} actorId={} clanId={} cursorRowNo={} processedCount={} publishedCount={} result=success",
                job.getId(), job.getExecutionStage(), transition.from().value(), transition.to().value(), actorId, clanId,
                job.getCursorRowNo(), job.getProcessedCount(), job.getPublishedCount()
        );
        return toResponse(job);
    }

    @Transactional
    public ImportJobExecutionResponse resume(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = requireAsyncJob(clanId, jobId, actorId);
        ImportJobStateMachine.Transition transition = stateMachine.resume(job, LocalDateTime.now());
        jobRepository.save(job);
        record(job, actorId, "import_job_resume", "继续导入任务");
        log.info(
                "event=import_job_resumed jobId={} stage={} fromStatus={} toStatus={} actorId={} clanId={} cursorRowNo={} processedCount={} publishedCount={} result=success",
                job.getId(), job.getExecutionStage(), transition.from().value(), transition.to().value(), actorId, clanId,
                job.getCursorRowNo(), job.getProcessedCount(), job.getPublishedCount()
        );
        return toResponse(job);
    }

    @Transactional
    public ImportJobExecutionResponse cancel(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = requireAsyncJob(clanId, jobId, actorId);
        ImportJobStateMachine.Transition transition = stateMachine.cancel(job, LocalDateTime.now());
        if (transition.changed()) deletePayloadIfPresent(job.getId());
        jobRepository.save(job);
        record(job, actorId, "import_job_cancel", "取消导入任务");
        log.info(
                "event=import_job_cancel_requested jobId={} stage={} fromStatus={} toStatus={} actorId={} clanId={} cursorRowNo={} processedCount={} publishedCount={} result=success",
                job.getId(), job.getExecutionStage(), transition.from().value(), transition.to().value(), actorId, clanId,
                job.getCursorRowNo(), job.getProcessedCount(), job.getPublishedCount()
        );
        return toResponse(job);
    }

    @Transactional
    public ImportJobExecutionResponse retry(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = requireAsyncJob(clanId, jobId, actorId);
        String failureStage = job.getFailureStage();
        if (!ImportJobEntity.STAGE_PUBLISHING.equals(failureStage) && !payloadRepository.existsById(jobId)) {
            throw new BusinessException("IMPORT_JOB_PAYLOAD_NOT_FOUND", "原始文件已不存在，无法恢复解析，请重新上传");
        }
        ImportJobStateMachine.Transition transition = stateMachine.retry(job, LocalDateTime.now());
        jobRepository.save(job);
        record(job, actorId, "import_job_retry", "重试失败批次或失败行");
        log.info(
                "event=import_job_recovered jobId={} stage={} failureStage={} fromStatus={} toStatus={} actorId={} clanId={} cursorRowNo={} processedCount={} publishedCount={} result=queued",
                job.getId(), job.getExecutionStage(), failureStage, transition.from().value(), transition.to().value(), actorId,
                clanId, job.getCursorRowNo(), job.getProcessedCount(), job.getPublishedCount()
        );
        return toResponse(job);
    }

    private ImportJobEntity requireAsyncJob(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = requireJob(clanId, jobId, actorId);
        if (!job.isAsyncExecution()) throw new BusinessException("IMPORT_JOB_NOT_ASYNC", "当前任务不是异步任务");
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
                ? value(job.getPublishedCount()) : value(job.getProcessedCount());
        int denominator = ImportJobEntity.STAGE_PUBLISHING.equals(job.getExecutionStage())
                ? Math.max(0, value(job.getSuccessCount())) : total;
        int remaining = Math.max(0, denominator - progress);
        int percent = denominator <= 0 ? 0 : Math.min(100, (int) Math.round(progress * 100.0d / denominator));
        if (stateMachine.state(job).terminal()) percent = Math.max(percent, 100);
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
        return stateMachine.allowedActions(job);
    }

    private void deletePayloadIfPresent(Long jobId) {
        if (payloadRepository.existsById(jobId)) payloadRepository.deleteById(jobId);
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
