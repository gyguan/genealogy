package com.genealogy.member.dto;

import java.util.List;

public record GrantableRoleResponse(
        String roleCode,
        String roleName,
        String description,
        List<String> allowedScopeTypes,
        String riskLevel
) {
}
