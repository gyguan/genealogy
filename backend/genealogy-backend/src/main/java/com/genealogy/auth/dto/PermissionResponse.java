package com.genealogy.auth.dto;

public record PermissionResponse(
        Long id,
        String permissionCode,
        String permissionName,
        String moduleCode,
        String moduleName,
        String resourceCode,
        String actionCode,
        String description,
        String status
) {
}
