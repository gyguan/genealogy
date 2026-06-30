package com.genealogy.member.dto;

import java.time.LocalDateTime;

public record RoleResponse(
        Long id,
        String roleCode,
        String roleName,
        String roleType,
        String description,
        Boolean systemRole,
        LocalDateTime createdAt
) {
}
