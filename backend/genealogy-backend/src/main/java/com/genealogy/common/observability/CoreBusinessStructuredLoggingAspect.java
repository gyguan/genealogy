package com.genealogy.common.observability;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.CodeSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.StringJoiner;

/**
 * Adds a single structured log entry around core Application Service write operations.
 *
 * <p>The pointcut deliberately excludes repository/mapper code and ordinary reads. Only
 * identifiers and status-like scalar parameters are emitted; request bodies, file content,
 * credentials and personal contact data are never serialized.</p>
 */
@Aspect
@Component
public class CoreBusinessStructuredLoggingAspect {

    private static final Logger log = LoggerFactory.getLogger(CoreBusinessStructuredLoggingAspect.class);

    private static final Set<String> SAFE_PARAMETER_NAMES = Set.of(
            "traceId", "actorId", "clanId", "branchId", "targetId", "targetType",
            "membershipId", "grantId", "taskId", "reviewTaskId", "revisionId", "jobId",
            "personId", "relationshipId", "sourceId", "attachmentId", "fromStatus", "toStatus", "status"
    );

    @Around("memberWrites() || reviewWrites() || importLifecycleWrites() || genealogyWrites() || sensitiveOutputWrites()")
    public Object logCoreBusinessWrite(ProceedingJoinPoint joinPoint) throws Throwable {
        long startedAt = System.nanoTime();
        String methodName = joinPoint.getSignature().getName();
        String event = eventName(joinPoint);
        Map<String, Object> safeFields = safeFields(joinPoint);

        try {
            Object result = joinPoint.proceed();
            long durationMs = elapsedMillis(startedAt);
            String message = message(event, safeFields, "success", durationMs, null);
            if (isFinalFailureTransition(methodName)) {
                log.error(message);
            } else if (isRetryOrManualIntervention(methodName)) {
                log.warn(message);
            } else {
                log.info(message);
            }
            return result;
        } catch (Throwable throwable) {
            long durationMs = elapsedMillis(startedAt);
            String message = message(
                    event,
                    safeFields,
                    "failed",
                    durationMs,
                    throwable.getClass().getSimpleName()
            );
            if (isImportLifecycle(joinPoint) && !isRetryOrManualIntervention(methodName)) {
                log.error(message);
            } else {
                log.warn(message);
            }
            throw throwable;
        }
    }

    @org.aspectj.lang.annotation.Pointcut(
            "execution(* com.genealogy.member.application.MemberPermissionApplicationService.createGrant(..)) || " +
            "execution(* com.genealogy.member.application.MemberPermissionApplicationService.updateGrant(..)) || " +
            "execution(* com.genealogy.member.application.MemberPermissionApplicationService.revokeGrant(..)) || " +
            "execution(* com.genealogy.member.application.MemberPermissionApplicationService.updateMemberStatus(..))"
    )
    public void memberWrites() {
    }

    @org.aspectj.lang.annotation.Pointcut(
            "execution(* com.genealogy.review.application..*.create*(..)) || " +
            "execution(* com.genealogy.review.application..*.submit*(..)) || " +
            "execution(* com.genealogy.review.application..*.approve*(..)) || " +
            "execution(* com.genealogy.review.application..*.reject*(..)) || " +
            "execution(* com.genealogy.review.application..*.withdraw*(..)) || " +
            "execution(* com.genealogy.review.application..*.cancel*(..))"
    )
    public void reviewWrites() {
    }

    @org.aspectj.lang.annotation.Pointcut(
            "execution(* com.genealogy.imports.application..*.claim*(..)) || " +
            "execution(* com.genealogy.imports.application..*.transition*(..)) || " +
            "execution(* com.genealogy.imports.application..*.retry*(..)) || " +
            "execution(* com.genealogy.imports.application..*.requestManual*(..)) || " +
            "execution(* com.genealogy.imports.application..*.pause*(..)) || " +
            "execution(* com.genealogy.imports.application..*.resume*(..)) || " +
            "execution(* com.genealogy.imports.application..*.complete*(..)) || " +
            "execution(* com.genealogy.imports.application..*.fail*(..)) || " +
            "execution(* com.genealogy.imports.application..*.cancel*(..))"
    )
    public void importLifecycleWrites() {
    }

    @org.aspectj.lang.annotation.Pointcut(
            "execution(* com.genealogy.person.application..*.create*(..)) || " +
            "execution(* com.genealogy.person.application..*.update*(..)) || " +
            "execution(* com.genealogy.person.application..*.delete*(..)) || " +
            "execution(* com.genealogy.relationship.application..*.create*(..)) || " +
            "execution(* com.genealogy.relationship.application..*.update*(..)) || " +
            "execution(* com.genealogy.relationship.application..*.delete*(..)) || " +
            "execution(* com.genealogy.branch.application..*.create*(..)) || " +
            "execution(* com.genealogy.branch.application..*.update*(..)) || " +
            "execution(* com.genealogy.branch.application..*.delete*(..))"
    )
    public void genealogyWrites() {
    }

    @org.aspectj.lang.annotation.Pointcut(
            "execution(* com.genealogy..export..*ApplicationService.export*(..)) || " +
            "execution(* com.genealogy.source..*Attachment*ApplicationService.delete*(..))"
    )
    public void sensitiveOutputWrites() {
    }

    private Map<String, Object> safeFields(ProceedingJoinPoint joinPoint) {
        Map<String, Object> fields = new LinkedHashMap<>();
        if (!(joinPoint.getSignature() instanceof CodeSignature signature)) {
            return fields;
        }
        String[] parameterNames = signature.getParameterNames();
        Object[] arguments = joinPoint.getArgs();
        for (int i = 0; i < parameterNames.length && i < arguments.length; i++) {
            String parameterName = parameterNames[i];
            Object argument = arguments[i];
            if (SAFE_PARAMETER_NAMES.contains(parameterName) && isSafeScalar(argument)) {
                fields.put(parameterName, argument);
            }
        }
        return fields;
    }

    private boolean isSafeScalar(Object value) {
        return value == null || value instanceof Number || value instanceof Boolean || value instanceof Enum<?>;
    }

    private String eventName(ProceedingJoinPoint joinPoint) {
        String className = joinPoint.getSignature().getDeclaringType().getSimpleName()
                .replace("ApplicationService", "")
                .replace("Service", "");
        return toSnakeCase(className + "_" + joinPoint.getSignature().getName());
    }

    private String toSnakeCase(String value) {
        return value.replaceAll("([a-z0-9])([A-Z])", "$1_$2")
                .replace('-', '_')
                .toLowerCase(Locale.ROOT);
    }

    private String message(
            String event,
            Map<String, Object> fields,
            String result,
            long durationMs,
            String errorType
    ) {
        StringJoiner joiner = new StringJoiner(" ");
        joiner.add("event=" + event);
        fields.forEach((key, value) -> joiner.add(key + "=" + value));
        joiner.add("result=" + result);
        joiner.add("durationMs=" + durationMs);
        if (errorType != null) {
            joiner.add("errorType=" + errorType);
        }
        return joiner.toString();
    }

    private boolean isRetryOrManualIntervention(String methodName) {
        String normalized = methodName.toLowerCase(Locale.ROOT);
        return normalized.contains("retry") || normalized.contains("manual") || normalized.contains("resume");
    }

    private boolean isFinalFailureTransition(String methodName) {
        String normalized = methodName.toLowerCase(Locale.ROOT);
        return normalized.startsWith("fail") || normalized.contains("markfailed") || normalized.contains("completefailed");
    }

    private boolean isImportLifecycle(ProceedingJoinPoint joinPoint) {
        return joinPoint.getSignature().getDeclaringTypeName().startsWith("com.genealogy.imports.application.");
    }

    private long elapsedMillis(long startedAt) {
        return (System.nanoTime() - startedAt) / 1_000_000L;
    }
}
