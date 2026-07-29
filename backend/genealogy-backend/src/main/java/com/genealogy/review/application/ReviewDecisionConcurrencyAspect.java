package com.genealogy.review.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.review.domain.ReviewAction;
import com.genealogy.review.domain.ReviewStateMachine;
import com.genealogy.review.dto.ReviewDecisionRequest;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Owns the review decision consistency boundary.
 *
 * <p>The outer transaction locks the task row, loads its revision, validates the
 * explicit state transition and submitter/reviewer separation, and only then
 * invokes the application command. Decisions for different task ids remain
 * independent, while concurrent decisions for the same task are serialized.</p>
 */
@Aspect
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ReviewDecisionConcurrencyAspect {

    private final CheckTaskRepository checkTaskRepository;
    private final AuditRecordRepository auditRecordRepository;
    private final ReviewStateMachine reviewStateMachine;
    private final TransactionTemplate transactionTemplate;

    public ReviewDecisionConcurrencyAspect(
            CheckTaskRepository checkTaskRepository,
            AuditRecordRepository auditRecordRepository,
            ReviewStateMachine reviewStateMachine,
            PlatformTransactionManager transactionManager
    ) {
        this.checkTaskRepository = checkTaskRepository;
        this.auditRecordRepository = auditRecordRepository;
        this.reviewStateMachine = reviewStateMachine;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Around("execution(* com.genealogy.review.application.ApprovalApplicationService.approve(..))")
    public Object approve(ProceedingJoinPoint joinPoint) throws Throwable {
        return executeDecision(joinPoint, ReviewAction.APPROVE);
    }

    @Around("execution(* com.genealogy.review.application.ApprovalApplicationService.reject(..))")
    public Object reject(ProceedingJoinPoint joinPoint) throws Throwable {
        return executeDecision(joinPoint, ReviewAction.REJECT);
    }

    private Object executeDecision(ProceedingJoinPoint joinPoint, ReviewAction action) throws Throwable {
        Object[] arguments = joinPoint.getArgs();
        if (arguments.length < 2
                || !(arguments[0] instanceof Long taskId)
                || !(arguments[1] instanceof ReviewDecisionRequest request)) {
            return joinPoint.proceed();
        }

        Throwable[] failure = new Throwable[1];
        Object result = transactionTemplate.execute(status -> {
            CheckTaskEntity task = checkTaskRepository.findByIdForDecision(taskId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.REVIEW_TASK_NOT_FOUND));
            AuditRecordEntity revision = auditRecordRepository.findById(task.getRevisionId())
                    .orElseThrow(() -> new BusinessException("REVIEW_RECORD_NOT_FOUND", "review record not found"));

            reviewStateMachine.target(task.getStatus(), revision.getStatus(), action);
            reviewStateMachine.requireIndependentReviewer(revision.getSubmitterId(), request.reviewerId());

            try {
                return joinPoint.proceed();
            } catch (Throwable throwable) {
                failure[0] = throwable;
                status.setRollbackOnly();
                return null;
            }
        });
        if (failure[0] != null) {
            throw failure[0];
        }
        return result;
    }
}
