package com.genealogy.review.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.entity.AuditRecordEntity;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Locale;

/** Runtime diagnostics for review transitions; persistent audit remains in OperationLogApplicationService. */
@Aspect
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 100)
public class ReviewRuntimeLoggingAspect {

    private static final Logger log = LoggerFactory.getLogger(ReviewRuntimeLoggingAspect.class);

    @Around("execution(* com.genealogy.review.application.ApprovalApplicationService.submit*(..))")
    public Object logSubmission(ProceedingJoinPoint joinPoint) throws Throwable {
        long startedAt = System.nanoTime();
        try {
            Object result = joinPoint.proceed();
            if (result instanceof CheckTaskResponse task) {
                log.info(
                        "event=review_transition_completed traceId={} revisionId={} reviewTaskId={} targetType={} targetId={} actorId={} clanId={} fromStatus=none toStatus={} action=submit result=success costMs={}",
                        task.traceId(), task.revisionId(), task.id(), task.targetType(), task.targetId(), task.submitterId(),
                        task.clanId(), task.status(), costMs(startedAt)
                );
                log.info(
                        "event=review_task_created traceId={} revisionId={} reviewTaskId={} targetType={} targetId={} actorId={} clanId={} toStatus={} result=success costMs={}",
                        task.traceId(), task.revisionId(), task.id(), task.targetType(), task.targetId(), task.submitterId(),
                        task.clanId(), task.status(), costMs(startedAt)
                );
            }
            return result;
        } catch (BusinessException exception) {
            log.warn(
                    "event=review_transition_rejected action=submit reasonCode={} result=rejected costMs={}",
                    exception.getCode(), costMs(startedAt)
            );
            throw exception;
        }
    }

    @Around("execution(* com.genealogy.review.application.ApprovalApplicationService.approve(..))"
            + " || execution(* com.genealogy.review.application.ApprovalApplicationService.reject(..))")
    public Object logDecision(ProceedingJoinPoint joinPoint) throws Throwable {
        long startedAt = System.nanoTime();
        String action = ((MethodSignature) joinPoint.getSignature()).getMethod().getName().toLowerCase(Locale.ROOT);
        try {
            Object result = joinPoint.proceed();
            if (result instanceof CheckTaskResponse task) {
                log.info(
                        "event=review_transition_completed traceId={} revisionId={} reviewTaskId={} targetType={} targetId={} actorId={} clanId={} fromStatus=pending toStatus={} action={} result=success costMs={}",
                        task.traceId(), task.revisionId(), task.id(), task.targetType(), task.targetId(), task.reviewerId(),
                        task.clanId(), task.status(), action, costMs(startedAt)
                );
            }
            return result;
        } catch (BusinessException exception) {
            log.warn(
                    "event=review_transition_rejected action={} reasonCode={} result=rejected costMs={}",
                    action, exception.getCode(), costMs(startedAt)
            );
            throw exception;
        }
    }

    @Around("execution(* com.genealogy.review.application.RevisionApplyService.apply(..))")
    public Object logApply(ProceedingJoinPoint joinPoint) throws Throwable {
        long startedAt = System.nanoTime();
        AuditRecordEntity revision = revision(joinPoint);
        log.info(
                "event=review_apply_started traceId={} revisionId={} targetType={} targetId={} clanId={} fromStatus=approved toStatus=applying result=started costMs=0",
                traceId(revision), revisionId(revision), targetType(revision), targetId(revision), clanId(revision)
        );
        try {
            Object result = joinPoint.proceed();
            log.info(
                    "event=review_apply_completed traceId={} revisionId={} targetType={} targetId={} clanId={} fromStatus=approved toStatus=applied result=success costMs={}",
                    traceId(revision), revisionId(revision), targetType(revision), targetId(revision), clanId(revision), costMs(startedAt)
            );
            return result;
        } catch (Throwable throwable) {
            log.error(
                    "event=review_apply_failed traceId={} revisionId={} targetType={} targetId={} clanId={} fromStatus=approved toStatus=failed result=failed errorCode={} costMs={}",
                    traceId(revision), revisionId(revision), targetType(revision), targetId(revision), clanId(revision),
                    errorCode(throwable), costMs(startedAt), throwable
            );
            throw throwable;
        }
    }

    private AuditRecordEntity revision(ProceedingJoinPoint joinPoint) {
        Object[] arguments = joinPoint.getArgs();
        return arguments.length > 0 && arguments[0] instanceof AuditRecordEntity value ? value : null;
    }

    private String errorCode(Throwable throwable) {
        return throwable instanceof BusinessException businessException
                ? businessException.getCode()
                : "REVIEW_APPLY_FAILED";
    }

    private Object traceId(AuditRecordEntity revision) { return revision == null ? null : revision.getTraceId(); }
    private Long revisionId(AuditRecordEntity revision) { return revision == null ? null : revision.getId(); }
    private String targetType(AuditRecordEntity revision) { return revision == null ? null : revision.getTargetType(); }
    private Long targetId(AuditRecordEntity revision) { return revision == null ? null : revision.getTargetId(); }
    private Long clanId(AuditRecordEntity revision) { return revision == null ? null : revision.getClanId(); }

    private long costMs(long startedAt) {
        return Math.max(0L, (System.nanoTime() - startedAt) / 1_000_000L);
    }
}
