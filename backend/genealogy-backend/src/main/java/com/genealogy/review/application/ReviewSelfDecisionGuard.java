package com.genealogy.review.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.review.dto.ReviewDecisionRequest;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

import java.util.Objects;

/**
 * Enforces submitter/reviewer separation before an approval decision mutates task or revision state.
 * The rule is applied at the service boundary so every controller and compatibility endpoint shares it.
 */
@Aspect
@Component
public class ReviewSelfDecisionGuard {

    private final CheckTaskRepository checkTaskRepository;
    private final AuditRecordRepository auditRecordRepository;

    public ReviewSelfDecisionGuard(
            CheckTaskRepository checkTaskRepository,
            AuditRecordRepository auditRecordRepository
    ) {
        this.checkTaskRepository = checkTaskRepository;
        this.auditRecordRepository = auditRecordRepository;
    }

    @Before("execution(* com.genealogy.review.application.ApprovalApplicationService.approve(..)) || "
            + "execution(* com.genealogy.review.application.ApprovalApplicationService.reject(..))")
    public void preventSubmitterDecision(JoinPoint joinPoint) {
        Object[] arguments = joinPoint.getArgs();
        if (arguments.length < 2 || !(arguments[0] instanceof Long taskId)
                || !(arguments[1] instanceof ReviewDecisionRequest request)) {
            return;
        }
        checkTaskRepository.findById(taskId)
                .flatMap(task -> auditRecordRepository.findById(task.getRevisionId()))
                .filter(record -> Objects.equals(record.getSubmitterId(), request.reviewerId()))
                .ifPresent(record -> {
                    throw new BusinessException(
                            "REVIEW_SELF_DECISION_FORBIDDEN",
                            "提交人不能审核自己的变更"
                    );
                });
    }
}
