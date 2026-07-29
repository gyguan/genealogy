package com.genealogy.review.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.review.domain.ReviewQualityCheckStatus;
import com.genealogy.review.entity.ReviewQualityCheckEntity;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ReviewQualityCheckStateMachineTest {

    private final ReviewQualityCheckStateMachine stateMachine = new ReviewQualityCheckStateMachine();

    @Test
    void allowsOnlyDeclaredTransitions() {
        ReviewQualityCheckEntity entity = new ReviewQualityCheckEntity();
        entity.setStatus(ReviewQualityCheckStatus.QUEUED.name());

        stateMachine.transition(entity, ReviewQualityCheckStatus.RUNNING);
        stateMachine.transition(entity, ReviewQualityCheckStatus.PASSED);

        assertThat(entity.getStatus()).isEqualTo("PASSED");
        assertThat(entity.getStartedAt()).isNotNull();
        assertThat(entity.getCompletedAt()).isNotNull();
    }

    @Test
    void failsFastForIllegalTransition() {
        ReviewQualityCheckEntity entity = new ReviewQualityCheckEntity();
        entity.setStatus(ReviewQualityCheckStatus.QUEUED.name());

        assertThatThrownBy(() -> stateMachine.transition(entity, ReviewQualityCheckStatus.PASSED))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("不允许");
    }
}
