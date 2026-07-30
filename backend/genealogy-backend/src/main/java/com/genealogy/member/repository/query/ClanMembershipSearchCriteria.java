package com.genealogy.member.repository.query;

import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;

import java.util.Collection;
import java.util.List;

public record ClanMembershipSearchCriteria(
        Long clanId,
        String keyword,
        boolean filterByRoleCodes,
        List<String> roleCodes,
        boolean filterByScopeTypes,
        List<MemberRoleScopeType> scopeTypes,
        boolean filterByMemberStatuses,
        List<MemberStatus> memberStatuses,
        boolean fullClanAccess,
        MemberRoleScopeType branchScope,
        MemberRoleScopeType branchSubtreeScope,
        List<Long> visibleBranchIds,
        List<Long> visibleSubtreeIds
) {
    public ClanMembershipSearchCriteria {
        roleCodes = copy(roleCodes);
        scopeTypes = copy(scopeTypes);
        memberStatuses = copy(memberStatuses);
        visibleBranchIds = copy(visibleBranchIds);
        visibleSubtreeIds = copy(visibleSubtreeIds);
        keyword = keyword == null || keyword.isBlank() ? null : keyword.trim().toLowerCase();
    }
    private static <T> List<T> copy(Collection<T> values) {
        return values == null ? List.of() : List.copyOf(values);
    }
}
