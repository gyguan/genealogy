package com.genealogy.culture.governance;

import java.util.Set;

public record CultureTargetContext(
        Long clanId,
        Long branchId,
        String targetType,
        Long targetId,
        String displayName,
        String dataStatus,
        String privacyLevel,
        String sensitiveLevel,
        Long createdBy,
        String sensitiveViewPermission,
        String restrictedLogSummary
) {
    private static final Set<String> RESTRICTED_PRIVACY = Set.of("relatives_only", "private", "sealed");

    public boolean archived() {
        return "archived".equals(normalize(dataStatus));
    }

    public boolean restricted() {
        String privacy = normalize(privacyLevel);
        String sensitive = normalize(sensitiveLevel);
        return RESTRICTED_PRIVACY.contains(privacy)
                || "sensitive".equals(sensitive)
                || "highly_sensitive".equals(sensitive);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
