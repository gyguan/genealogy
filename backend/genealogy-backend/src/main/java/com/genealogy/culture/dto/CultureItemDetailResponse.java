package com.genealogy.culture.dto;

import java.util.List;

public record CultureItemDetailResponse(
        CultureItemSummaryResponse item,
        String content,
        List<CultureSourceSummaryResponse> sources,
        List<CultureAttachmentSummaryResponse> attachments,
        CultureReviewSummaryResponse review
) {
    public CultureItemDetailResponse {
        sources = sources == null ? List.of() : List.copyOf(sources);
        attachments = attachments == null ? List.of() : List.copyOf(attachments);
        review = review == null ? CultureReviewSummaryResponse.empty() : review;
    }
}
