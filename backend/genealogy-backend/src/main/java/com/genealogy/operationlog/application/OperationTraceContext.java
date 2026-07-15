package com.genealogy.operationlog.application;

import java.util.UUID;

/**
 * Stable linkage metadata for one business revision lifecycle.
 *
 * <p>The trace id is correlation data only. It never grants access and callers
 * must still enforce the normal business and authorization rules.</p>
 */
public record OperationTraceContext(
        UUID traceId,
        Long revisionId,
        Long reviewTaskId,
        String businessTargetType,
        Long businessTargetId,
        String eventResult
) {

    public static OperationTraceContext of(
            UUID traceId,
            Long revisionId,
            Long reviewTaskId,
            String businessTargetType,
            Long businessTargetId,
            String eventResult
    ) {
        return new OperationTraceContext(
                traceId,
                revisionId,
                reviewTaskId,
                trimToNull(businessTargetType),
                businessTargetId,
                trimToNull(eventResult)
        );
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
