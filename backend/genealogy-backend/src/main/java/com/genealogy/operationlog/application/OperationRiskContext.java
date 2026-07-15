package com.genealogy.operationlog.application;

public record OperationRiskContext(
        String riskLevel,
        String eventType,
        String dispositionStatus,
        Long branchId
) {

    public static OperationRiskContext of(
            String riskLevel,
            String eventType,
            String dispositionStatus,
            Long branchId
    ) {
        return new OperationRiskContext(riskLevel, eventType, dispositionStatus, branchId);
    }
}
