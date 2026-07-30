package com.genealogy.imports.domain;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.entity.ImportJobEntity;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImportJobStateMachineTest {

    private final ImportJobStateMachine stateMachine = new ImportJobStateMachine();
    private final LocalDateTime now = LocalDateTime.of(2026, 7, 30, 10, 0);

    @Test
    void queuedJobCanPauseImmediately() {
        ImportJobEntity job = job(ImportExecutionState.QUEUED);

        ImportJobStateMachine.Transition transition = stateMachine.pause(job, now);

        assertThat(transition.from()).isEqualTo(ImportExecutionState.QUEUED);
        assertThat(transition.to()).isEqualTo(ImportExecutionState.PAUSED);
        assertThat(job.getExecutionStatus()).isEqualTo("paused");
        assertThat(job.getRequestedAction()).isNull();
    }

    @Test
    void runningJobRequestsPauseAtSafePoint() {
        ImportJobEntity job = job(ImportExecutionState.RUNNING);

        ImportJobStateMachine.Transition transition = stateMachine.pause(job, now);

        assertThat(transition.requested()).isTrue();
        assertThat(job.getExecutionStatus()).isEqualTo("running");
        assertThat(job.getRequestedAction()).isEqualTo(ImportJobEntity.ACTION_PAUSE);
    }

    @Test
    void pausedJobCanResumeAndClearsLease() {
        ImportJobEntity job = job(ImportExecutionState.PAUSED);
        job.setLeaseOwner("worker-1");
        job.setLeaseExpiresAt(now.plusMinutes(1));

        stateMachine.resume(job, now);

        assertThat(job.getExecutionStatus()).isEqualTo("queued");
        assertThat(job.getLeaseOwner()).isNull();
        assertThat(job.getLeaseExpiresAt()).isNull();
    }

    @Test
    void cancellationIsPartialAfterSideEffects() {
        ImportJobEntity job = job(ImportExecutionState.PAUSED);
        job.setProcessedCount(1);

        stateMachine.cancel(job, now);

        assertThat(job.getExecutionStatus()).isEqualTo("partial_cancelled");
        assertThat(job.getExecutionStage()).isEqualTo(ImportJobEntity.STAGE_CANCELLED);
        assertThat(job.getCompletedAt()).isEqualTo(now);
    }

    @Test
    void failedJobCanRetryFromPublishingStage() {
        ImportJobEntity job = job(ImportExecutionState.FAILED);
        job.setFailureStage(ImportJobEntity.STAGE_PUBLISHING);
        job.setExecutionRetryCount(3);
        job.setLastErrorCode("IMPORT_FAILED");

        stateMachine.retry(job, now);

        assertThat(job.getExecutionStatus()).isEqualTo("queued");
        assertThat(job.getExecutionStage()).isEqualTo(ImportJobEntity.STAGE_PUBLISHING);
        assertThat(job.getExecutionRetryCount()).isZero();
        assertThat(job.getLastErrorCode()).isNull();
    }

    @Test
    void completedJobCannotBeCancelled() {
        ImportJobEntity job = job(ImportExecutionState.COMPLETED);

        assertThatThrownBy(() -> stateMachine.cancel(job, now))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("终态任务不能再次取消");
    }

    private ImportJobEntity job(ImportExecutionState state) {
        ImportJobEntity job = new ImportJobEntity();
        job.setExecutionMode(ImportJobEntity.EXECUTION_MODE_ASYNC);
        job.setExecutionStatus(state.value());
        job.setExecutionStage(ImportJobEntity.STAGE_PARSING);
        job.setProcessedCount(0);
        job.setPublishedCount(0);
        return job;
    }
}
