package com.genealogy.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RevokeMemberGrantRequest(
        @NotBlank @Size(max = 500) String reason
) {
}
