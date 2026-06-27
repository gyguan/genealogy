package com.genealogy.review.dto;

import jakarta.validation.constraints.Size;

public record TargetSubmitRequest(
        Long submitterId,

        @Size(max = 1000, message = "说明长度不能超过1000")
        String diffSummary
) {
}
