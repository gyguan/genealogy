package com.genealogy.common.domain;

import com.genealogy.common.exception.BusinessException;

import java.util.Locale;
import java.util.Set;

public final class ApprovedStatusPolicy {

    private static final Set<String> APPROVED_STATUSES = Set.of("official", "approved", "active");

    private ApprovedStatusPolicy() {
    }

    public static boolean isApproved(String status) {
        return status != null && APPROVED_STATUSES.contains(status.trim().toLowerCase(Locale.ROOT));
    }

    public static void requireApproved(String status, String code, String message) {
        if (!isApproved(status)) {
  throw new BusinessException(code, message);
        }
    }
}
