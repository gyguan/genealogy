package com.genealogy.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateMemberGrantRequest(
        @NotNull Long userId,
        @NotBlank String roleCode,
        @NotBlank String scopeType,
        @NotNull Long scopeId,
        @NotBlank @Size(max = 500) String reason
) {
}
