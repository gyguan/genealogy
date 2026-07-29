package com.genealogy.operationlog.observability;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

/** Records the real persistence outcome while preserving the repository exception semantics. */
@Aspect
@Component
public class OperationLogRepositoryMetricsAspect {

    private final OperationLogMetrics metrics;

    public OperationLogRepositoryMetricsAspect(OperationLogMetrics metrics) {
        this.metrics = metrics;
    }

    @Around("bean(operationLogRepository) && execution(* save(..))")
    public Object measureWrite(ProceedingJoinPoint joinPoint) throws Throwable {
        try {
            Object result = joinPoint.proceed();
            metrics.recordSuccess();
            return result;
        } catch (Throwable failure) {
            metrics.recordFailure();
            throw failure;
        }
    }
}
