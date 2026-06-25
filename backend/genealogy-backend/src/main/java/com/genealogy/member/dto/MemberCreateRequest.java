package com.genealogy.member.dto;

import com.genealogy.member.enums.MemberScopeType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record MemberCreateRequest(
        @NotNull Long userId,
        Long branchId,
        @NotNull Long roleId,
        @NotBlank String memberName,
        MemberScopeType scopeType,
        Long scopeId
) {
}
