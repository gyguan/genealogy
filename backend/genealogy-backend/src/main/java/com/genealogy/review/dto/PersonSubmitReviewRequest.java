package com.genealogy.review.dto;

import jakarta.validation.constraints.Size;

public record PersonSubmitReviewRequest(
        Long submitterId,

        @Size(max = 1000, message = "变更说明长度不能超过1000")
        String diffSummary
) {
}
