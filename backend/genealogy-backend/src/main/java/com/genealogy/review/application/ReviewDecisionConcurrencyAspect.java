package com.genealogy.review.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
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
 * Serializes approve/reject decisions for the same review task.
 *
 * <p>The aspect owns the outer transaction, obtains a PostgreSQL row lock, and
 * then invokes the existing transactional decision method. Decisions for
 * different task ids remain independent.</p>
 */
@Aspect
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ReviewDecisionConcurrencyAspect {

    private final CheckTaskRepository checkTaskRepository;
    private final TransactionTemplate transactionTemplate;

    public ReviewDecisionConcurrencyAspect(
            CheckTaskRepository checkTaskRepository,
            PlatformTransactionManager transactionManager
    ) {
        this.checkTaskRepository = checkTaskRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Around("execution(* com.genealogy.review.application.ApprovalApplicationService.approve(..))"
            + " || execution(* com.genealogy.review.application.ApprovalApplicationService.reject(..))")
    public Object lockTaskForDecision(ProceedingJoinPoint joinPoint) throws Throwable {
        Object[] arguments = joinPoint.getArgs();
        if (arguments.length == 0 || !(arguments[0] instanceof Long taskId)) {
            return joinPoint.proceed();
        }

        Throwable[] failure = new Throwable[1];
        Object result = transactionTemplate.execute(status -> {
            checkTaskRepository.findByIdForDecision(taskId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.REVIEW_TASK_NOT_FOUND));
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
