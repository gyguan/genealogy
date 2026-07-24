package com.genealogy.quality.check;

import java.util.Locale;
import java.util.Set;

public enum QualityCheckScopeType {
    REVIEW_TASK,
    WORKBENCH_SESSION,
    DRAFT_IDS,
    QUERY;

    private static final Set<String> LEGACY_REVIEW_TASK = Set.of("TASK_IDS", "REVIEW_TASK");

    public static QualityCheckScopeType parse(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (LEGACY_REVIEW_TASK.contains(normalized)) return REVIEW_TASK;
        try {
            return valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Unsupported quality check scope: " + value, ex);
        }
    }

    public String persistedValue(String requestedValue) {
        return this == REVIEW_TASK && "TASK_IDS".equalsIgnoreCase(requestedValue) ? "TASK_IDS" : name();
    }
}
