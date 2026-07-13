package com.genealogy.imports.dto;

import jakarta.validation.constraints.Size;

public record ImportJobReviewSubmitRequest(
        @Size(max = 500) String comment
) {
}
