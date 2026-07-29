package com.genealogy.review.application;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ReviewRuntimeLoggingArchitectureTest {

    private static final Path APPLICATION = Path.of("src/main/java/com/genealogy/review/application");

    @Test
    void reviewLifecycleMustExposeStableTransitionAndApplyEvents() throws IOException {
        String logging = Files.readString(APPLICATION.resolve("ReviewRuntimeLoggingAspect.java"));

        assertThat(logging)
                .contains("event=review_transition_completed")
                .contains("event=review_task_created")
                .contains("event=review_transition_rejected")
                .contains("event=review_apply_started")
                .contains("event=review_apply_completed")
                .contains("event=review_apply_failed")
                .contains("traceId={}")
                .contains("revisionId={}")
                .contains("reviewTaskId={}")
                .contains("targetType={}")
                .contains("targetId={}")
                .contains("actorId={}")
                .contains("clanId={}")
                .contains("fromStatus=")
                .contains("toStatus=")
                .contains("costMs={}");
    }

    @Test
    void stateMachineRejectionsMustLogStableReasonCodesAtLockBoundary() throws IOException {
        String concurrency = Files.readString(APPLICATION.resolve("ReviewDecisionConcurrencyAspect.java"));

        assertThat(concurrency)
                .contains("event=review_transition_rejected")
                .contains("reasonCode={}")
                .contains("reviewStateMachine.target")
                .contains("reviewStateMachine.requireIndependentReviewer")
                .doesNotContain("reviewComment={}")
                .doesNotContain("diffSummary={}")
                .doesNotContain("oldPayload={}")
                .doesNotContain("newPayload={}");
    }

    @Test
    void reviewConclusionsMustRemainPersistentlyAudited() throws IOException {
        String approval = Files.readString(APPLICATION.resolve("ApprovalApplicationService.java"));

        assertThat(approval)
                .contains("\"review_submit\"")
                .contains("\"review_approve\"")
                .contains("\"review_reject\"")
                .contains("\"revision_apply\"")
                .contains("operationLogApplicationService.record");
    }
}
