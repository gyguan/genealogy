package com.genealogy.review.dto;

public record ReviewTargetSummaryResponse(
        String displayTitle,
        String fileName,
        String branchName,
        Integer draftCount,
        Integer excludedCount,
        Integer reviewRound
) {
}
