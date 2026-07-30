package com.genealogy.review.application;

import com.genealogy.operationlog.application.OperationTraceContext;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Explicit runtime event derived from stable review lifecycle actions. */
public record ReviewLifecycleEvent(
        String event,
        UUID traceId,
        Long revisionId,
        Long reviewTaskId,
        String targetType,
        Long targetId,
        Long actorId,
        Long clanId,
        String fromStatus,
        String toStatus,
        String action,
        String result,
        String errorCode,
        long costMs
) {

    static List<ReviewLifecycleEvent> fromOperation(
            Long clanId,
            Long actorId,
            String actionType,
            String targetType,
            Long targetId,
            OperationTraceContext trace
    ) {
        if (trace == null || actionType == null) return List.of();
        String action = actionType.trim().toLowerCase(Locale.ROOT);
        return switch (action) {
            case "review_submit" -> List.of(
                    event("review_transition_completed", clanId, actorId, targetType, targetId, trace,
                            "none", "pending", "submit", "success"),
                    event("review_task_created", clanId, actorId, targetType, targetId, trace,
                            "none", "pending", "submit", "success")
            );
            case "review_approve" -> List.of(event(
                    "review_transition_completed", clanId, actorId, targetType, targetId, trace,
                    "pending", "approved", "approve", "success"
            ));
            case "review_reject" -> List.of(event(
                    "review_transition_completed", clanId, actorId, targetType, targetId, trace,
                    "pending", "rejected", "reject", "success"
            ));
            case "revision_apply" -> List.of(event(
                    "review_apply_completed", clanId, actorId, targetType, targetId, trace,
                    "approved", "applied", "apply", "success"
            ));
            default -> List.of();
        };
    }

    private static ReviewLifecycleEvent event(
            String event,
            Long clanId,
            Long actorId,
            String targetType,
            Long targetId,
            OperationTraceContext trace,
            String fromStatus,
            String toStatus,
            String action,
            String result
    ) {
        return new ReviewLifecycleEvent(
                event,
                trace.traceId(),
                trace.revisionId(),
                trace.reviewTaskId(),
                trace.businessTargetType() == null ? targetType : trace.businessTargetType(),
                trace.businessTargetId() == null ? targetId : trace.businessTargetId(),
                actorId,
                clanId,
                fromStatus,
                toStatus,
                action,
                result,
                null,
                0L
        );
    }
}
