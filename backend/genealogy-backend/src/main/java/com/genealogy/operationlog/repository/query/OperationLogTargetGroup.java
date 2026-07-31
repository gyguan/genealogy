package com.genealogy.operationlog.repository.query;

import java.util.List;

public record OperationLogTargetGroup(String targetType, List<Long> targetIds) {
    public OperationLogTargetGroup {
        targetIds = targetIds == null ? List.of() : List.copyOf(targetIds);
    }
}
