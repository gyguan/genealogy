package com.genealogy.operationlog.application;

import com.genealogy.common.exception.BusinessException;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

public final class OperationRiskPolicy {

    public static final String LEVEL_LOW = "low";
    public static final String LEVEL_MEDIUM = "medium";
    public static final String LEVEL_HIGH = "high";
    public static final String LEVEL_CRITICAL = "critical";

    public static final String EVENT_PERMISSION_CHANGE = "permission_change";
    public static final String EVENT_SENSITIVE_ACCESS = "sensitive_access";
    public static final String EVENT_BULK_EXPORT = "bulk_export";
    public static final String EVENT_FORMAL_DATA_CHANGE = "formal_data_change";
    public static final String EVENT_REVIEW_ANOMALY = "review_anomaly";
    public static final String EVENT_ACCESS_DENIED = "access_denied";

    public static final String DISPOSITION_OPEN = "open";
    public static final String DISPOSITION_REVIEWING = "reviewing";
    public static final String DISPOSITION_RESOLVED = "resolved";
    public static final String DISPOSITION_ACCEPTED = "accepted";

    private static final Set<String> LEVELS = Set.of(LEVEL_LOW, LEVEL_MEDIUM, LEVEL_HIGH, LEVEL_CRITICAL);
    private static final Set<String> EVENTS = Set.of(
            EVENT_PERMISSION_CHANGE,
            EVENT_SENSITIVE_ACCESS,
            EVENT_BULK_EXPORT,
            EVENT_FORMAL_DATA_CHANGE,
            EVENT_REVIEW_ANOMALY,
            EVENT_ACCESS_DENIED
    );
    private static final Set<String> DISPOSITIONS = Set.of(
            DISPOSITION_OPEN,
            DISPOSITION_REVIEWING,
            DISPOSITION_RESOLVED,
            DISPOSITION_ACCEPTED
    );

    private static final Map<String, OperationRiskContext> STABLE_ACTION_RULES = Map.ofEntries(
            Map.entry("member_grant_create", context(LEVEL_HIGH, EVENT_PERMISSION_CHANGE, DISPOSITION_RESOLVED)),
            Map.entry("member_grant_update", context(LEVEL_HIGH, EVENT_PERMISSION_CHANGE, DISPOSITION_RESOLVED)),
            Map.entry("member_grant_revoke", context(LEVEL_HIGH, EVENT_PERMISSION_CHANGE, DISPOSITION_RESOLVED)),
            Map.entry("member_status_update", context(LEVEL_HIGH, EVENT_PERMISSION_CHANGE, DISPOSITION_RESOLVED)),
            Map.entry("operation_log_export", context(LEVEL_HIGH, EVENT_BULK_EXPORT, DISPOSITION_RESOLVED)),
            Map.entry("person_export", context(LEVEL_HIGH, EVENT_BULK_EXPORT, DISPOSITION_RESOLVED)),
            Map.entry("relationship_export", context(LEVEL_HIGH, EVENT_BULK_EXPORT, DISPOSITION_RESOLVED)),
            Map.entry("genealogy_book_export", context(LEVEL_HIGH, EVENT_BULK_EXPORT, DISPOSITION_RESOLVED)),
            Map.entry("attachment_export", context(LEVEL_HIGH, EVENT_BULK_EXPORT, DISPOSITION_RESOLVED)),
            Map.entry("person_delete", context(LEVEL_CRITICAL, EVENT_FORMAL_DATA_CHANGE, DISPOSITION_RESOLVED)),
            Map.entry("relationship_delete", context(LEVEL_CRITICAL, EVENT_FORMAL_DATA_CHANGE, DISPOSITION_RESOLVED)),
            Map.entry("source_attachment_delete", context(LEVEL_HIGH, EVENT_FORMAL_DATA_CHANGE, DISPOSITION_RESOLVED)),
            Map.entry("review_reject", context(LEVEL_MEDIUM, EVENT_REVIEW_ANOMALY, DISPOSITION_OPEN)),
            Map.entry("authorization_denied", context(LEVEL_HIGH, EVENT_ACCESS_DENIED, DISPOSITION_OPEN)),
            Map.entry("permission_denied", context(LEVEL_HIGH, EVENT_ACCESS_DENIED, DISPOSITION_OPEN))
    );

    private OperationRiskPolicy() {
    }

    public static OperationRiskContext resolve(String actionType, OperationRiskContext explicitContext) {
        if (explicitContext != null) {
            return validate(explicitContext);
        }
        return STABLE_ACTION_RULES.get(normalize(actionType));
    }

    public static OperationRiskContext permissionChange(boolean critical, Long branchId) {
        return validate(new OperationRiskContext(
                critical ? LEVEL_CRITICAL : LEVEL_HIGH,
                EVENT_PERMISSION_CHANGE,
                DISPOSITION_RESOLVED,
                branchId
        ));
    }

    public static OperationRiskContext sensitiveAccess(boolean highlySensitive, boolean download, Long branchId) {
        return validate(new OperationRiskContext(
                highlySensitive || download ? LEVEL_HIGH : LEVEL_MEDIUM,
                EVENT_SENSITIVE_ACCESS,
                DISPOSITION_RESOLVED,
                branchId
        ));
    }

    public static OperationRiskContext bulkExport(Long branchId) {
        return validate(new OperationRiskContext(LEVEL_HIGH, EVENT_BULK_EXPORT, DISPOSITION_RESOLVED, branchId));
    }

    public static OperationRiskContext validate(OperationRiskContext context) {
        String level = normalize(context.riskLevel());
        String eventType = normalize(context.eventType());
        String disposition = normalize(context.dispositionStatus());
        if (!LEVELS.contains(level)) {
            throw new BusinessException("OPERATION_RISK_LEVEL_INVALID", "风险等级不正确");
        }
        if (!EVENTS.contains(eventType)) {
            throw new BusinessException("OPERATION_RISK_EVENT_INVALID", "风险事件类型不正确");
        }
        if (!DISPOSITIONS.contains(disposition)) {
            throw new BusinessException("OPERATION_RISK_DISPOSITION_INVALID", "风险处置状态不正确");
        }
        return new OperationRiskContext(level, eventType, disposition, context.branchId());
    }

    private static OperationRiskContext context(String level, String eventType, String disposition) {
        return new OperationRiskContext(level, eventType, disposition, null);
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim().toLowerCase(Locale.ROOT);
    }
}
