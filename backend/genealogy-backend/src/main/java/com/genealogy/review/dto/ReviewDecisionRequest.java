package com.genealogy.review.dto;

import jakarta.validation.constraints.Size;

public record ReviewDecisionRequest(
        Long reviewerId,

        @Size(max = 1000, message = "审核意见长度不能超过1000")
        String comment
) {
}
