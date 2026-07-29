package com.genealogy.review.domain;

import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ReviewStateMachineTest {

    private final ReviewStateMachine stateMachine = new ReviewStateMachine();

    @ParameterizedTest
    @CsvSource({
            "pending,pending,APPROVE,approved",
            "pending,pending,REJECT,rejected",
            "pending,pending,CANCEL,cancelled",
            "approved,approved,APPLY,applied"
    })
    void allowsDeclaredTransitions(String task, String revision, ReviewAction action, String target) {
        assertThat(stateMachine.target(task, revision, action).value()).isEqualTo(target);
    }

    @ParameterizedTest
    @CsvSource({
            "approved,approved,APPROVE",
            "rejected,rejected,APPROVE",
            "cancelled,cancelled,REJECT"
    })
    void repeatedDecisionUsesStableHandledConflict(String task, String revision, ReviewAction action) {
        assertThatThrownBy(() -> stateMachine.target(task, revision, action))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo("REVIEW_TASK_ALREADY_HANDLED");
    }

    @ParameterizedTest
    @CsvSource({
            "rejected,rejected,APPLY",
            "applied,applied,APPLY",
            "pending,pending,APPLY"
    })
    void rejectsOtherUndeclaredTransitions(String task, String revision, ReviewAction action) {
        assertThatThrownBy(() -> stateMachine.target(task, revision, action))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo("REVIEW_ILLEGAL_TRANSITION");
    }

    @Test
    void rejectsTaskAndRevisionStateDrift() {
        assertThatThrownBy(() -> stateMachine.target("pending", "approved", ReviewAction.APPROVE))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo("REVIEW_STATE_INCONSISTENT");
    }

    @Test
    void rejectsSelfReviewWithStableCode() {
        assertThatThrownBy(() -> stateMachine.requireIndependentReviewer(42L, 42L))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo("REVIEW_SELF_DECISION_FORBIDDEN");
    }

    @Test
    void allowsDifferentSubmitterAndReviewer() {
        stateMachine.requireIndependentReviewer(42L, 43L);
    }
}
