package com.genealogy.source.dto;

import jakarta.validation.constraints.Size;

public record SourceBindingReviewDecisionRequest(
        @Size(max = 1000) String reviewComment
) {
}
