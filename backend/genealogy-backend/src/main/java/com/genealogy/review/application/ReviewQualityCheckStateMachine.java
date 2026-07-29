package com.genealogy.review.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.review.domain.ReviewQualityCheckStatus;
import com.genealogy.review.entity.ReviewQualityCheckEntity;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class ReviewQualityCheckStateMachine {

    public void transition(ReviewQualityCheckEntity entity, ReviewQualityCheckStatus target) {
        ReviewQualityCheckStatus current = ReviewQualityCheckStatus.parse(entity.getStatus());
        if (!current.canTransitionTo(target)) {
            throw new BusinessException(
                    "REVIEW_QUALITY_STATE_CONFLICT",
                    "质量检查状态不允许从 " + current.name() + " 迁移到 " + target.name()
            );
        }
        entity.setStatus(target.name());
        LocalDateTime now = LocalDateTime.now();
        if (target == ReviewQualityCheckStatus.RUNNING) entity.setStartedAt(now);
        if (target.terminal()) entity.setCompletedAt(now);
    }
}
