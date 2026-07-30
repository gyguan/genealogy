package com.genealogy.review.application;

import com.genealogy.operationlog.application.OperationTraceContext;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ReviewRuntimeLoggingArchitectureTest {

    private static final OperationTraceContext TRACE = OperationTraceContext.of(
            UUID.fromString("123e4567-e89b-12d3-a456-426614174000"),
            11L,
            22L,
            "person",
            33L,
            "completed"
    );

    @Test
    void submitActionProducesTransitionAndTaskCreatedEvents() {
        List<ReviewLifecycleEvent> events = ReviewLifecycleEvent.fromOperation(
                1L, 2L, "review_submit", "person", 33L, TRACE
        );

        assertThat(events).extracting(ReviewLifecycleEvent::event)
                .containsExactly("review_transition_completed", "review_task_created");
        assertThat(events.get(0))
                .returns("none", ReviewLifecycleEvent::fromStatus)
                .returns("pending", ReviewLifecycleEvent::toStatus)
                .returns("submit", ReviewLifecycleEvent::action)
                .returns(TRACE.traceId(), ReviewLifecycleEvent::traceId);
    }

    @Test
    void decisionsUseStableExplicitLifecycleActions() {
        ReviewLifecycleEvent approved = single("review_approve");
        ReviewLifecycleEvent rejected = single("review_reject");
        ReviewLifecycleEvent applied = single("revision_apply");

        assertThat(approved)
                .returns("pending", ReviewLifecycleEvent::fromStatus)
                .returns("approved", ReviewLifecycleEvent::toStatus)
                .returns("approve", ReviewLifecycleEvent::action);
        assertThat(rejected)
                .returns("pending", ReviewLifecycleEvent::fromStatus)
                .returns("rejected", ReviewLifecycleEvent::toStatus)
                .returns("reject", ReviewLifecycleEvent::action);
        assertThat(applied)
                .returns("review_apply_completed", ReviewLifecycleEvent::event)
                .returns("approved", ReviewLifecycleEvent::fromStatus)
                .returns("applied", ReviewLifecycleEvent::toStatus);
    }

    @Test
    void unrelatedOrUntracedOperationsDoNotProduceReviewEvents() {
        assertThat(ReviewLifecycleEvent.fromOperation(1L, 2L, "person_update", "person", 33L, TRACE)).isEmpty();
        assertThat(ReviewLifecycleEvent.fromOperation(1L, 2L, "review_approve", "person", 33L, null)).isEmpty();
    }

    private ReviewLifecycleEvent single(String action) {
        return ReviewLifecycleEvent.fromOperation(1L, 2L, action, "person", 33L, TRACE).get(0);
    }
}
