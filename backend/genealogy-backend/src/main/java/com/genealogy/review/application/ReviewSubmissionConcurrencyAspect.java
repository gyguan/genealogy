package com.genealogy.review.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.review.repository.PersonReviewSubmissionLockRepository;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Serializes concurrent review submissions for the same person.
 *
 * <p>The outer transaction obtains a PostgreSQL row lock before the existing
 * submitPerson transaction reads the current status. A second request waits for
 * the first commit and then observes pending_review, so it is rejected without
 * creating another revision or task.</p>
 */
@Aspect
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ReviewSubmissionConcurrencyAspect {

    private final PersonReviewSubmissionLockRepository lockRepository;
    private final TransactionTemplate transactionTemplate;

    public ReviewSubmissionConcurrencyAspect(
            PersonReviewSubmissionLockRepository lockRepository,
            PlatformTransactionManager transactionManager
    ) {
        this.lockRepository = lockRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Around("execution(* com.genealogy.review.application.ApprovalApplicationService.submitPerson(..))")
    public Object lockPersonForSubmission(ProceedingJoinPoint joinPoint) throws Throwable {
        Object[] arguments = joinPoint.getArgs();
        if (arguments.length == 0 || !(arguments[0] instanceof Long personId)) {
            return joinPoint.proceed();
        }

        Throwable[] failure = new Throwable[1];
        Object result = transactionTemplate.execute(status -> {
            lockRepository.findByIdForReviewSubmission(personId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
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
