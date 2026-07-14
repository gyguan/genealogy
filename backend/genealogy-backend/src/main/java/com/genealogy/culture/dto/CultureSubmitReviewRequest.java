package com.genealogy.culture.dto;

import jakarta.validation.constraints.Size;

public record CultureSubmitReviewRequest(
        @Size(max = 1000) String comment
) {
}
