package com.genealogy.branch.dto;

import java.time.LocalDateTime;

public record BranchResponse(
        Long id,
        Long clanId,
        Long parentId,
        String branchName,
        String branchPath,
        Integer level,
        Integer sortOrder,
        Long founderPersonId,
        String migrationFrom,
        String migrationTo,
        Long managerMemberId,
        String description,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
