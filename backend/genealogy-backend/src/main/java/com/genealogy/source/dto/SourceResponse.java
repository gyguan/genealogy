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
        String excerpt,
        String verificationStatus,
        LocalDateTime createdAt
) {
}
