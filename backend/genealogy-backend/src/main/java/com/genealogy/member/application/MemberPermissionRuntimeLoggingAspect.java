package com.genealogy.member.application;

import com.genealogy.member.dto.MemberGrantResponse;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Runtime summaries for member grants; detailed before/after data remains in OperationLog. */
@Aspect
@Component
public class MemberPermissionRuntimeLoggingAspect {

    private static final Logger log = LoggerFactory.getLogger(MemberPermissionRuntimeLoggingAspect.class);

    @Around("execution(* com.genealogy.member.application.MemberPermissionApplicationService.createGrant(..))"
            + " || execution(* com.genealogy.member.application.MemberPermissionApplicationService.updateGrant(..))"
            + " || execution(* com.genealogy.member.application.MemberPermissionApplicationService.revokeGrant(..))"
            + " || execution(* com.genealogy.member.application.MemberPermissionApplicationService.updateMemberStatus(..))")
    public Object logChange(ProceedingJoinPoint joinPoint) throws Throwable {
        long startedAt = System.nanoTime();
        Object[] args = joinPoint.getArgs();
        Long clanId = longArg(args, 0);
        Long actorId = longArg(args, 1);
        Long requestedTargetId = longArg(args, 2);
        String action = ((MethodSignature) joinPoint.getSignature()).getMethod().getName();
        try {
            Object result = joinPoint.proceed();
            Long targetId = result instanceof MemberGrantResponse grant ? grant.id() : requestedTargetId;
            log.info(
                    "event=member_permission_changed actorId={} clanId={} targetType={} targetId={} action={} result=success costMs={}",
                    actorId, clanId, targetType(action), targetId, action, costMs(startedAt)
            );
            return result;
        } catch (Throwable throwable) {
            log.warn(
                    "event=member_permission_change_rejected actorId={} clanId={} targetType={} targetId={} action={} result=rejected errorCode={} costMs={}",
                    actorId, clanId, targetType(action), requestedTargetId, action,
                    throwable.getClass().getSimpleName(), costMs(startedAt)
            );
            throw throwable;
        }
    }

    private String targetType(String action) {
        return "updateMemberStatus".equals(action) ? "clan_membership" : "member_role";
    }

    private Long longArg(Object[] args, int index) {
        return args.length > index && args[index] instanceof Long value ? value : null;
    }

    private long costMs(long startedAt) {
        return Math.max(0L, (System.nanoTime() - startedAt) / 1_000_000L);
    }
}
