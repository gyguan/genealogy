package com.genealogy.review.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ReviewSubmitRequest(
        @NotBlank String targetType,
        @NotNull Long targetId,
        String changeType,
        String comment
) {
}
