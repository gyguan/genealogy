package com.genealogy.review.domain;

public enum ReviewQualityCheckMode {
    INCREMENTAL,
    FULL,
    REVIEW_GATE;

    public static ReviewQualityCheckMode parse(String value) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException("review quality mode is required");
        return valueOf(value.trim().toUpperCase());
    }
}
