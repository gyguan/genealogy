package com.genealogy.review.domain;

import com.genealogy.common.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;

/**
 * Single source of truth for review lifecycle transitions and actor separation.
 *
 * <p>The task and revision are treated as one consistency boundary. A command is
 * accepted only when both records expose the same source state and the transition
 * is present in the matrix below.</p>
 */
@Component
public class ReviewStateMachine {

    private static final Map<ReviewStatus, Map<ReviewAction, ReviewStatus>> TRANSITIONS = transitions();

    public ReviewStatus target(String taskStatus, String revisionStatus, ReviewAction action) {
        ReviewStatus task = ReviewStatus.from(taskStatus);
        ReviewStatus revision = ReviewStatus.from(revisionStatus);
        if (task != revision) {
            throw new BusinessException(
                    "REVIEW_STATE_INCONSISTENT",
                    "审核任务与修订状态不一致: task=" + task.value() + ", revision=" + revision.value()
            );
        }
        ReviewStatus target = TRANSITIONS.getOrDefault(task, Map.of()).get(action);
        if (target == null) {
            throw new BusinessException(
                    "REVIEW_ILLEGAL_TRANSITION",
                    "不允许的审核状态转换: " + task.value() + " --" + action.name().toLowerCase() + "--> ?"
            );
        }
        return target;
    }

    public void requireIndependentReviewer(Long submitterId, Long reviewerId) {
        if (submitterId != null && Objects.equals(submitterId, reviewerId)) {
            throw new BusinessException("REVIEW_SELF_APPROVAL_FORBIDDEN", "提交人不能审核本人提交的内容");
        }
    }

    public boolean isIdempotentlyApplied(String revisionStatus, ReviewAction action) {
        return action == ReviewAction.APPLY && ReviewStatus.APPLIED == ReviewStatus.from(revisionStatus);
    }

    private static Map<ReviewStatus, Map<ReviewAction, ReviewStatus>> transitions() {
        EnumMap<ReviewStatus, Map<ReviewAction, ReviewStatus>> matrix = new EnumMap<>(ReviewStatus.class);
        matrix.put(ReviewStatus.PENDING, Map.of(
                ReviewAction.APPROVE, ReviewStatus.APPROVED,
                ReviewAction.REJECT, ReviewStatus.REJECTED,
                ReviewAction.CANCEL, ReviewStatus.CANCELLED
        ));
        matrix.put(ReviewStatus.APPROVED, Map.of(ReviewAction.APPLY, ReviewStatus.APPLIED));
        return Map.copyOf(matrix);
    }
}
