package com.genealogy.operationlog.application;

import com.genealogy.operationlog.entity.OperationLogEntity;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

/** Keeps runtime event publication in the application layer after a new audit row is persisted. */
@Aspect
@Component
public class OperationLogRepositoryEventAspect {

    @Around("execution(* com.genealogy.operationlog.repository.OperationLogRepository.save(com.genealogy.operationlog.entity.OperationLogEntity)) && args(entity)")
    public Object publishAfterInsert(ProceedingJoinPoint joinPoint, OperationLogEntity entity) throws Throwable {
        boolean inserted = entity != null && entity.getId() == null;
        Object result = joinPoint.proceed();
        if (inserted) {
            OperationLogEventBridge.publish(entity);
        }
        return result;
    }
}
