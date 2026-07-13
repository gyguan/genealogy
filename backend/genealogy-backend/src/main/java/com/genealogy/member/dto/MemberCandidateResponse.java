package com.genealogy.member.dto;

public record MemberCandidateResponse(
        Long userId,
        String displayName,
        String maskedAccount,
        boolean alreadyMember
) {
}
