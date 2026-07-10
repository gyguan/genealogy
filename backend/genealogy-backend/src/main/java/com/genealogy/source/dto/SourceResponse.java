package com.genealogy.source.dto;

import java.time.LocalDateTime;

public record SourceResponse(
        Long id,
        Long clanId,
        String sourceName,
        String sourceType,
        String providerName,
        String bookTitle,
        String volumeNo,
        String pageNo,
        String sourceDate,
        String excerpt,
        String description,
        String verificationStatus,
        String confidenceLevel,
        String privacyLevel,
        String sensitiveLevel,
        Integer bindingCount,
        Integer attachmentCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
