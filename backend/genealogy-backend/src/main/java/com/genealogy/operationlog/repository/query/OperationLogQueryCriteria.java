package com.genealogy.operationlog.repository.query;

import java.time.LocalDateTime;
import java.util.List;

public record OperationLogQueryCriteria(
        Long clanId,
        List<Long> actorIds,
        List<String> actionTypes,
        List<String> targetTypes,
        Long targetId,
        List<String> resultStatuses,
        LocalDateTime startTime,
        LocalDateTime endTime,
        String keyword,
        List<OperationLogTargetGroup> targetGroups,
        boolean riskOnly,
        List<String> riskLevels,
        List<String> riskEventTypes,
        List<String> dispositionStatuses,
        boolean enforceBranchScope,
        List<Long> visibleBranchIds
) {
    public OperationLogQueryCriteria {
        actorIds = copy(actorIds);
        actionTypes = copy(actionTypes);
        targetTypes = copy(targetTypes);
        resultStatuses = copy(resultStatuses);
        targetGroups = targetGroups == null ? List.of() : List.copyOf(targetGroups);
        riskLevels = copy(riskLevels);
        riskEventTypes = copy(riskEventTypes);
        dispositionStatuses = copy(dispositionStatuses);
        visibleBranchIds = copy(visibleBranchIds);
    }

    private static <T> List<T> copy(List<T> values) {
        return values == null ? List.of() : List.copyOf(values);
    }
}
