package com.genealogy.operationlog.dto;

import java.util.List;

public record RiskAuditStatsResponse(
        long total,
        List<Item> byLevel,
        List<Item> byEventType,
        List<Item> byDisposition
) {

    public record Item(String key, long count) {
    }
}
