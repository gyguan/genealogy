package com.genealogy.branch.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.branch.dto.BranchResponse;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Aspect
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class BranchListDataScopeAspect {

    private static final String BRANCH_VIEW = "branch:view";

    private final AuthorizationApplicationService authorizationApplicationService;
    private final RbacAuthorizationApplicationService rbacAuthorizationApplicationService;

    public BranchListDataScopeAspect(
            AuthorizationApplicationService authorizationApplicationService,
            RbacAuthorizationApplicationService rbacAuthorizationApplicationService
    ) {
        this.authorizationApplicationService = authorizationApplicationService;
        this.rbacAuthorizationApplicationService = rbacAuthorizationApplicationService;
    }

    @Around("execution(* com.genealogy.branch.application.BranchApplicationService.listByClan(java.lang.Long,java.lang.Long))")
    public Object filterVisibleBranches(ProceedingJoinPoint joinPoint) throws Throwable {
        Object result = joinPoint.proceed();
        if (!(result instanceof List<?> rows)) {
            return result;
        }
        Object[] args = joinPoint.getArgs();
        if (args.length < 2 || !(args[0] instanceof Long clanId) || !(args[1] instanceof Long actorId)) {
            return result;
        }
        if (authorizationApplicationService.isCrossClanAdmin(actorId)) {
            return result;
        }

        RbacAuthorizationApplicationService.PermissionDataScope scope =
                rbacAuthorizationApplicationService.permissionDataScope(actorId, clanId, BRANCH_VIEW);
        if (scope.fullClanAccess()) {
            return result;
        }
        return rows.stream()
                .filter(BranchResponse.class::isInstance)
                .map(BranchResponse.class::cast)
                .filter(branch -> scope.canAccessBranch(branch.id()))
                .toList();
    }
}
