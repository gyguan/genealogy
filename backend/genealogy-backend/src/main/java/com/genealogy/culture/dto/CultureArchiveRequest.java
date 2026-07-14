package com.genealogy.culture.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CultureArchiveRequest(
        @NotBlank @Size(max = 1000) String reason
) {
}
