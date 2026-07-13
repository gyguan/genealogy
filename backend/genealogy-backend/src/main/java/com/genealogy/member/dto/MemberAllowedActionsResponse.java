package com.genealogy.member.dto;

public record MemberAllowedActionsResponse(
        boolean canGrantRole,
        boolean canEditGrant,
        boolean canRevokeGrant,
        boolean canDisableMember,
        boolean canViewHistory
) {
}
