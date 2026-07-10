package com.genealogy.source.dto;

public record SourceSearchCriteria(
        String keyword,
        String sourceType,
        String verificationStatus,
        String privacyLevel,
        String targetType,
        Boolean hasAttachment,
        Boolean hasBinding,
        String sort
) {
}
