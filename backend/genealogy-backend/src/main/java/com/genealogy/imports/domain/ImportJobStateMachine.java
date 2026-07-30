package com.genealogy.imports.domain;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.entity.ImportJobEntity;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Single authority for asynchronous import execution transitions.
 *
 * <p>The persistence model remains string-based for API and database compatibility,
 * while transition decisions are expressed through {@link ImportExecutionState}.</p>
 */
public class ImportJobStateMachine {

    public Transition pause(ImportJobEntity job, LocalDateTime now) {
        ImportExecutionState state = state(job);
        if (state == ImportExecutionState.PAUSED) return Transition.noop(state);
        if (!state.pausable()) {
            throw new BusinessException("IMPORT_JOB_PAUSE_NOT_ALLOWED", "当前任务状态不能暂停");
        }
        if (state == ImportExecutionState.RUNNING) {
            job.setRequestedAction(ImportJobEntity.ACTION_PAUSE);
            job.setUpdatedAt(now);
            return Transition.requested(state, state);
        }
        job.setExecutionStatus(ImportExecutionState.PAUSED.value());
        job.setRequestedAction(null);
        job.setNextRetryAt(null);
        job.setUpdatedAt(now);
        return Transition.changed(state, ImportExecutionState.PAUSED);
    }

    public Transition resume(ImportJobEntity job, LocalDateTime now) {
        ImportExecutionState state = state(job);
        if (state != ImportExecutionState.PAUSED) {
            throw new BusinessException("IMPORT_JOB_RESUME_NOT_ALLOWED", "只有已暂停任务可以继续");
        }
        job.setExecutionStatus(ImportExecutionState.QUEUED.value());
        job.setRequestedAction(null);
        job.setNextRetryAt(null);
        clearLease(job);
        job.setUpdatedAt(now);
        return Transition.changed(state, ImportExecutionState.QUEUED);
    }

    public Transition cancel(ImportJobEntity job, LocalDateTime now) {
        ImportExecutionState state = state(job);
        if (state.terminal()) {
            throw new BusinessException("IMPORT_JOB_CANCEL_NOT_ALLOWED", "终态任务不能再次取消");
        }
        if (state == ImportExecutionState.RUNNING) {
            job.setRequestedAction(ImportJobEntity.ACTION_CANCEL);
            job.setUpdatedAt(now);
            return Transition.requested(state, state);
        }
        ImportExecutionState target = hasSideEffects(job)
                ? ImportExecutionState.PARTIAL_CANCELLED
                : ImportExecutionState.CANCELLED;
        job.setExecutionStatus(target.value());
        job.setExecutionStage(ImportJobEntity.STAGE_CANCELLED);
        job.setStatus(target.value());
        job.setRequestedAction(null);
        job.setCompletedAt(now);
        clearLease(job);
        job.setUpdatedAt(now);
        return Transition.changed(state, target);
    }

    public Transition retry(ImportJobEntity job, LocalDateTime now) {
        ImportExecutionState state = state(job);
        if (!state.retryable()) {
            throw new BusinessException("IMPORT_JOB_RETRY_NOT_ALLOWED", "只有部分失败、失败或待人工介入任务可以重试");
        }
        job.setExecutionStage(retryStage(job.getFailureStage()));
        job.setExecutionStatus(ImportExecutionState.QUEUED.value());
        job.setExecutionRetryCount(0);
        job.setRequestedAction(null);
        job.setFailureStage(null);
        job.setLastErrorCode(null);
        job.setErrorSummary(null);
        job.setNextRetryAt(null);
        job.setManualInterventionRequired(false);
        job.setCompletedAt(null);
        clearLease(job);
        job.setUpdatedAt(now);
        return Transition.changed(state, ImportExecutionState.QUEUED);
    }

    public List<String> allowedActions(ImportJobEntity job) {
        if (!job.isAsyncExecution()) return List.of();
        return state(job).allowedActions();
    }

    public ImportExecutionState state(ImportJobEntity job) {
        return ImportExecutionState.from(job.getExecutionStatus());
    }

    private String retryStage(String failureStage) {
        if (ImportJobEntity.STAGE_PUBLISHING.equals(failureStage)) return ImportJobEntity.STAGE_PUBLISHING;
        if (ImportJobEntity.STAGE_DRAFTING.equals(failureStage)) return ImportJobEntity.STAGE_DRAFTING;
        return ImportJobEntity.STAGE_PARSING;
    }

    private boolean hasSideEffects(ImportJobEntity job) {
        return value(job.getProcessedCount()) > 0 || value(job.getPublishedCount()) > 0;
    }

    private void clearLease(ImportJobEntity job) {
        job.setLeaseOwner(null);
        job.setLeaseExpiresAt(null);
    }

    private int value(Integer value) {
        return value == null ? 0 : value;
    }

    public record Transition(
            ImportExecutionState from,
            ImportExecutionState to,
            boolean changed,
            boolean requested
    ) {
        public static Transition changed(ImportExecutionState from, ImportExecutionState to) {
            return new Transition(from, to, true, false);
        }

        public static Transition requested(ImportExecutionState from, ImportExecutionState to) {
            return new Transition(from, to, false, true);
        }

        public static Transition noop(ImportExecutionState state) {
            return new Transition(state, state, false, false);
        }
    }
}
