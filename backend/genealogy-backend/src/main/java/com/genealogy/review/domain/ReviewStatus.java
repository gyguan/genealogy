package com.genealogy.review.domain;

import com.genealogy.common.exception.BusinessException;

import java.util.Locale;

/** Canonical lifecycle states shared by review tasks and revisions. */
public enum ReviewStatus {
    PENDING("pending"),
    APPROVED("approved"),
    REJECTED("rejected"),
    CANCELLED("cancelled"),
    APPLIED("applied");

    private final String value;

    ReviewStatus(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static ReviewStatus from(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BusinessException("REVIEW_STATE_INVALID", "审核状态不能为空");
        }
        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        for (ReviewStatus status : values()) {
            if (status.value.equals(normalized)) {
                return status;
            }
        }
        throw new BusinessException("REVIEW_STATE_INVALID", "未知审核状态: " + raw);
    }
}
