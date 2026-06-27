package com.genealogy.operationlog.dto;

import java.util.List;

public record OperationLogStatsResponse(
        long totalCount,
        List<Item> byActionType,
        List<Item> byActorId
) {
    public record Item(
            String key,
            long count
    ) {
    }
}
