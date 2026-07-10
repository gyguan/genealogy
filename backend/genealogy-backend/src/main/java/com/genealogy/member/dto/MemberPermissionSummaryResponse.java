package com.genealogy.member.dto;

import java.time.LocalDateTime;

public record MemberPermissionSummaryResponse(
        long activeMemberCount,
        long adminCount,
        long branchManagerCount,
        long unassignedBranchCount,
        long highRiskGrantCount,
        LocalDateTime latestPermissionChangedAt
) {
}
