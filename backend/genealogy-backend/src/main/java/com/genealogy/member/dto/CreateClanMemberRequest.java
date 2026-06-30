package com.genealogy.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateClanMemberRequest(
        @NotNull Long userId,
        Long branchId,
        @NotBlank String roleCode,
        @NotBlank String memberName,
        @NotBlank String scopeType,
        Long scopeId
) {
}
