package com.genealogy.review.application;

import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.review.entity.ReviewQualityCheckEntity;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
public class ReviewQualityCheckAfterCommitActions {

    private final OperationLogApplicationService operationLogApplicationService;

    public ReviewQualityCheckAfterCommitActions(OperationLogApplicationService operationLogApplicationService) {
        this.operationLogApplicationService = operationLogApplicationService;
    }

    public void completion(ReviewQualityCheckEntity entity) {
        Runnable action = () -> operationLogApplicationService.record(
                entity.getClanId(),
                entity.getTriggeredBy(),
                "review_quality_complete",
                "review_quality_check",
                null,
                "完成审核质量检查",
                "checkId=" + entity.getId() + ", status=" + entity.getStatus()
                        + ", blocked=" + entity.isReviewBlocked()
        );
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}
