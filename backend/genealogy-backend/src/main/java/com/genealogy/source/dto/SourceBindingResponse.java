package com.genealogy.source.dto;

import java.time.LocalDateTime;

public record SourceBindingResponse(
        Long id,
        Long clanId,
        Long sourceId,
        String targetType,
        Long targetId,
        String bindingReason,
        String excerpt,
        Long createdBy,
        LocalDateTime createdAt
) {
}
