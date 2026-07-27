package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.relationship.dto.RelationshipCreateRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Aspect
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class RelationshipImportRowTransactionAspect {

    private final RelationshipImportRowTransactionService rowTransactionService;
    private final ThreadLocal<Integer> importDepth = ThreadLocal.withInitial(() -> 0);
    private final ThreadLocal<Boolean> delegating = ThreadLocal.withInitial(() -> false);

    public RelationshipImportRowTransactionAspect(
            RelationshipImportRowTransactionService rowTransactionService
    ) {
        this.rowTransactionService = rowTransactionService;
    }

    @Around("execution(* com.genealogy.imports.application.RelationshipImportApplicationService.importRelationships(..))")
    public Object markRelationshipImport(ProceedingJoinPoint joinPoint) throws Throwable {
        importDepth.set(importDepth.get() + 1);
        try {
            return joinPoint.proceed();
        } finally {
            int nextDepth = importDepth.get() - 1;
            if (nextDepth <= 0) {
                importDepth.remove();
            } else {
                importDepth.set(nextDepth);
            }
        }
    }

    @Around("execution(* com.genealogy.relationship.application.RelationshipApplicationService.create(java.lang.Long, com.genealogy.relationship.dto.RelationshipCreateRequest, java.lang.Long))")
    public Object isolateImportedRelationshipCreate(ProceedingJoinPoint joinPoint) throws Throwable {
        if (importDepth.get() <= 0 || Boolean.TRUE.equals(delegating.get())) {
            return joinPoint.proceed();
        }

        Object[] args = joinPoint.getArgs();
        if (args.length != 3
                || !(args[0] instanceof Long clanId)
                || !(args[1] instanceof RelationshipCreateRequest request)
                || !(args[2] instanceof Long actorId)) {
            throw new BusinessException(
                    "IMPORT_RELATIONSHIP_TRANSACTION_ARGUMENT_INVALID",
                    "人物关系导入行事务参数无效"
            );
        }

        delegating.set(true);
        try {
            return rowTransactionService.create(clanId, request, actorId);
        } finally {
            delegating.remove();
        }
    }
}
