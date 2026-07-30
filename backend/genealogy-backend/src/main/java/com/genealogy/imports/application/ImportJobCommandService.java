package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.domain.ImportJobStateMachine;
import com.genealogy.imports.dto.ImportJobExecutionResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.repository.ImportJobPayloadRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.function.Function;

/**
 * Command-side use cases for asynchronous import jobs.
 *
 * <p>The public compatibility facade remains {@link ImportJobExecutionApplicationService}; this class owns
 * command authorization, transition execution, persistence, audit and command-specific runtime logging.</p>
 */
final class ImportJobCommandService {

    private static final Logger log = LoggerFactory.getLogger(ImportJobCommandService.class);

    private final ImportJobRepository jobRepository;
    private final ImportJobPayloadRepository payloadRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;
    private final ImportJobStateMachine stateMachine;
    private final Function<ImportJobEntity, ImportJobExecutionResponse> responseMapper;

    ImportJobCommandService(
            ImportJobRepository jobRepository,
            ImportJobPayloadRepository payloadRepository,
            AuthorizationApplicationService authorizationApplicationService,
            OperationLogApplicationService operationLogApplicationService,
            ImportJobStateMachine stateMachine,
            Function<ImportJobEntity, ImportJobExecutionResponse> responseMapper
    ) {
        this.jobRepository = jobRepository;
        this.payloadRepository = payloadRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
        this.stateMachine = stateMachine;
        this.responseMapper = responseMapper;
    }

    ImportJobExecutionResponse pause(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = requireAsyncJob(clanId, jobId, actorId);
        ImportJobStateMachine.Transition transition = stateMachine.pause(job, LocalDateTime.now());
        jobRepository.save(job);
        record(job, actorId, "import_job_pause", "暂停导入任务");
        log.info(
                "event=import_job_pause_requested jobId={} stage={} fromStatus={} toStatus={} actorId={} clanId={} cursorRowNo={} processedCount={} publishedCount={} result=success",
                job.getId(), job.getExecutionStage(), transition.from().value(), transition.to().value(), actorId, clanId,
                job.getCursorRowNo(), job.getProcessedCount(), job.getPublishedCount()
        );
        return responseMapper.apply(job);
    }

    ImportJobExecutionResponse resume(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = requireAsyncJob(clanId, jobId, actorId);
        ImportJobStateMachine.Transition transition = stateMachine.resume(job, LocalDateTime.now());
        jobRepository.save(job);
        record(job, actorId, "import_job_resume", "继续导入任务");
        log.info(
                "event=import_job_resumed jobId={} stage={} fromStatus={} toStatus={} actorId={} clanId={} cursorRowNo={} processedCount={} publishedCount={} result=success",
                job.getId(), job.getExecutionStage(), transition.from().value(), transition.to().value(), actorId, clanId,
                job.getCursorRowNo(), job.getProcessedCount(), job.getPublishedCount()
        );
        return responseMapper.apply(job);
    }

    ImportJobExecutionResponse cancel(Long clanId, Long jobId, Long actorId) {
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
        return responseMapper.apply(job);
    }

    ImportJobExecutionResponse retry(Long clanId, Long jobId, Long actorId) {
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
        return responseMapper.apply(job);
    }

    private ImportJobEntity requireAsyncJob(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = jobRepository.findByIdAndClanId(jobId, clanId)
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_NOT_FOUND", "导入任务不存在"));
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, job.getBranchId());
        if (!job.isAsyncExecution()) {
            throw new BusinessException("IMPORT_JOB_NOT_ASYNC", "当前任务不是异步任务");
        }
        return job;
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
}
