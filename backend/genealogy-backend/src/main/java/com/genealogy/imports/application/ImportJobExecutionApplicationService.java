package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.domain.ImportJobStateMachine;
import com.genealogy.imports.dto.ImportJobExecutionResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.repository.ImportJobPayloadRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Compatibility facade for import execution queries and commands.
 *
 * <p>Command behavior is owned by {@link ImportJobCommandService}; this facade preserves the existing
 * controller contract while keeping query mapping separate from command orchestration.</p>
 */
@Service
public class ImportJobExecutionApplicationService {

    private final ImportJobRepository jobRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final ImportJobStateMachine stateMachine;
    private final ImportJobCommandService commandService;

    public ImportJobExecutionApplicationService(
            ImportJobRepository jobRepository,
            ImportJobPayloadRepository payloadRepository,
            AuthorizationApplicationService authorizationApplicationService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.jobRepository = jobRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.stateMachine = new ImportJobStateMachine();
        this.commandService = new ImportJobCommandService(
                jobRepository,
                payloadRepository,
                authorizationApplicationService,
                operationLogApplicationService,
                stateMachine,
                this::toResponse
        );
    }

    @Transactional(readOnly = true)
    public ImportJobExecutionResponse get(Long clanId, Long jobId, Long actorId) {
        return toResponse(requireJob(clanId, jobId, actorId));
    }

    @Transactional
    public ImportJobExecutionResponse pause(Long clanId, Long jobId, Long actorId) {
        return commandService.pause(clanId, jobId, actorId);
    }

    @Transactional
    public ImportJobExecutionResponse resume(Long clanId, Long jobId, Long actorId) {
        return commandService.resume(clanId, jobId, actorId);
    }

    @Transactional
    public ImportJobExecutionResponse cancel(Long clanId, Long jobId, Long actorId) {
        return commandService.cancel(clanId, jobId, actorId);
    }

    @Transactional
    public ImportJobExecutionResponse retry(Long clanId, Long jobId, Long actorId) {
        return commandService.retry(clanId, jobId, actorId);
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

    private int value(Integer value) {
        return value == null ? 0 : value;
    }
}
