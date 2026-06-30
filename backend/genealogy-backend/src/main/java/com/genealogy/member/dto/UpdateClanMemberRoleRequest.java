package com.genealogy.member.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateClanMemberRoleRequest(
        @NotBlank String roleCode,
        String memberStatus,
        String scopeType,
        Long scopeId,
        Long branchId
) {
}
