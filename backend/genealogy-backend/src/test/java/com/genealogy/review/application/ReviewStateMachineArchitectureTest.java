package com.genealogy.review.application;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ReviewStateMachineArchitectureTest {

    private static final Path MAIN = Path.of("src/main/java/com/genealogy/review");

    @Test
    void approveAndRejectMustPassLockedStateMachineBoundary() throws IOException {
        String aspect = Files.readString(MAIN.resolve("application/ReviewDecisionConcurrencyAspect.java"));
        String machine = Files.readString(MAIN.resolve("domain/ReviewStateMachine.java"));

        assertThat(aspect)
                .contains("findByIdForDecision(taskId)")
                .contains("reviewStateMachine.target(task.getStatus(), revision.getStatus(), action)")
                .contains("reviewStateMachine.requireIndependentReviewer")
                .contains("ReviewAction.APPROVE", "ReviewAction.REJECT");
        assertThat(machine)
                .contains("REVIEW_ILLEGAL_TRANSITION")
                .contains("REVIEW_STATE_INCONSISTENT")
                .contains("REVIEW_SELF_APPROVAL_FORBIDDEN")
                .contains("ReviewAction.APPLY")
                .doesNotContain("targetType");
    }

    @Test
    void transitionModelMustNotUseFreeFormActionStrings() throws IOException {
        String action = Files.readString(MAIN.resolve("domain/ReviewAction.java"));
        String status = Files.readString(MAIN.resolve("domain/ReviewStatus.java"));

        assertThat(action).contains("enum ReviewAction");
        assertThat(status).contains("enum ReviewStatus");
    }
}
