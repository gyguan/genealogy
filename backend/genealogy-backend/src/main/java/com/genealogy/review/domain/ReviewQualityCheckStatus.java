package com.genealogy.review.domain;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum ReviewQualityCheckStatus {
    QUEUED,
    RUNNING,
    PASSED,
    ISSUES_FOUND,
    FAILED;

    private static final Map<ReviewQualityCheckStatus, Set<ReviewQualityCheckStatus>> TRANSITIONS = Map.of(
            QUEUED, EnumSet.of(RUNNING, FAILED),
            RUNNING, EnumSet.of(PASSED, ISSUES_FOUND, FAILED),
            PASSED, EnumSet.noneOf(ReviewQualityCheckStatus.class),
            ISSUES_FOUND, EnumSet.noneOf(ReviewQualityCheckStatus.class),
            FAILED, EnumSet.noneOf(ReviewQualityCheckStatus.class)
    );

    public boolean canTransitionTo(ReviewQualityCheckStatus target) {
        return TRANSITIONS.getOrDefault(this, Set.of()).contains(target);
    }

    public static ReviewQualityCheckStatus parse(String value) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException("review quality status is required");
        return valueOf(value.trim().toUpperCase());
    }

    public boolean terminal() {
        return this == PASSED || this == ISSUES_FOUND || this == FAILED;
    }
}
