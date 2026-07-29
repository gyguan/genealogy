package com.genealogy.member.domain;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.domain.MemberGrantPolicyService.ActorScope;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;

import java.util.List;
import java.util.Map;
import java.util.Set;

public final class MemberGrantPolicy {

    public static final String ROLE_CROSS_CLAN_ADMIN = "cross_clan_admin";
    public static final String ROLE_CLAN_ADMIN = "clan_admin";
    public static final String ROLE_BRANCH_ADMIN = "branch_admin";
    public static final String ROLE_EDITOR = "editor";
    public static final String ROLE_REVIEWER = "reviewer";
    public static final String ROLE_VIEWER = "viewer";
    public static final String STATUS_ACTIVE = "active";

    private static final Set<String> CLAN_ADMIN_GRANTABLE_ROLES = Set.of(
            ROLE_CLAN_ADMIN,
            ROLE_BRANCH_ADMIN,
            ROLE_EDITOR,
            ROLE_REVIEWER,
            ROLE_VIEWER
    );
    private static final Set<String> BRANCH_ADMIN_GRANTABLE_ROLES = Set.of(ROLE_EDITOR, ROLE_VIEWER);

    public void requireReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BusinessException("MEMBER_PERMISSION_REASON_REQUIRED", "权限变更必须填写原因");
        }
    }

    public void validateRoleScope(
            Long clanId,
            String roleCode,
            MemberRoleScopeType scopeType,
            Long scopeId,
            boolean branchBelongsToClan
    ) {
        if (ROLE_CROSS_CLAN_ADMIN.equals(roleCode)) {
            throw new BusinessException("CROSS_CLAN_ADMIN_ASSIGN_FORBIDDEN", "跨宗族管理员不能在宗族成员页面授予");
        }
        if (!CLAN_ADMIN_GRANTABLE_ROLES.contains(roleCode)) {
            throw new BusinessException("MEMBER_ROLE_NOT_GRANTABLE", "该角色不允许通过成员权限接口授予");
        }
        if (ROLE_CLAN_ADMIN.equals(roleCode) || ROLE_REVIEWER.equals(roleCode)) {
            requireClanScope(clanId, scopeType, scopeId);
            return;
        }
        if (ROLE_BRANCH_ADMIN.equals(roleCode)) {
            requireBranchSubtreeScope(scopeType, scopeId, branchBelongsToClan);
            return;
        }
        if (scopeType == MemberRoleScopeType.clan) {
            requireClanScope(clanId, scopeType, scopeId);
        } else {
            requireBranchSubtreeScope(scopeType, scopeId, branchBelongsToClan);
        }
    }

    public List<String> grantableRoleCodes(ActorScope scope) {
        if (scope.fullClanAccess()) return CLAN_ADMIN_GRANTABLE_ROLES.stream().sorted().toList();
        if (!scope.visibleBranchIds().isEmpty()) return BRANCH_ADMIN_GRANTABLE_ROLES.stream().sorted().toList();
        return List.of();
    }

    public boolean canViewGrant(ActorScope scope, MemberRoleScopeType targetScopeType, Long targetScopeId) {
        if (scope.fullClanAccess()) return true;
        if (targetScopeId == null) return false;
        if (targetScopeType == MemberRoleScopeType.branch) return scope.visibleBranchIds().contains(targetScopeId);
        if (targetScopeType == MemberRoleScopeType.branch_subtree) return scope.visibleSubtreeIds().contains(targetScopeId);
        return false;
    }

    public boolean canManageGrant(
            ActorScope scope,
            String targetRoleCode,
            MemberRoleScopeType targetScopeType,
            Long targetScopeId
    ) {
        if (scope.fullClanAccess()) return CLAN_ADMIN_GRANTABLE_ROLES.contains(targetRoleCode);
        if (!BRANCH_ADMIN_GRANTABLE_ROLES.contains(targetRoleCode) || targetScopeId == null) return false;
        if (targetScopeType == MemberRoleScopeType.branch) return scope.visibleBranchIds().contains(targetScopeId);
        if (targetScopeType == MemberRoleScopeType.branch_subtree) return scope.visibleSubtreeIds().contains(targetScopeId);
        return false;
    }

    public void requireCanManageGrant(
            ActorScope scope,
            String targetRoleCode,
            MemberRoleScopeType targetScopeType,
            Long targetScopeId
    ) {
        if (!canManageGrant(scope, targetRoleCode, targetScopeType, targetScopeId)) {
            throw new BusinessException("MEMBER_GRANT_FORBIDDEN", "目标授权角色或范围超出当前操作者的管理边界");
        }
    }

    public boolean canManageMembership(
            ActorScope scope,
            List<MemberRoleEntity> grants,
            Map<Long, RoleEntity> roles
    ) {
        if (scope.fullClanAccess()) return true;
        if (grants.isEmpty()) return false;
        return grants.stream().allMatch(grant -> {
            RoleEntity role = roles.get(grant.getRoleId());
            return role != null && canManageGrant(scope, role.getRoleCode(), grant.getScopeType(), grant.getScopeId());
        });
    }

    public boolean containsClanAdminGrant(List<MemberRoleEntity> grants, Map<Long, RoleEntity> roles) {
        return grants.stream().anyMatch(grant -> {
            RoleEntity role = roles.get(grant.getRoleId());
            return role != null && isClanAdminGrant(grant, role.getRoleCode());
        });
    }

    public boolean isClanAdminGrant(MemberRoleEntity grant, String roleCode) {
        return STATUS_ACTIVE.equals(grant.getStatus())
                && ROLE_CLAN_ADMIN.equals(roleCode)
                && grant.getScopeType() == MemberRoleScopeType.clan;
    }

    public void requireAnotherClanAdmin(boolean removingClanAdmin, long activeClanAdminCount) {
        if (removingClanAdmin && activeClanAdminCount <= 1) {
            throw new BusinessException("LAST_CLAN_ADMIN_REQUIRED", "宗族必须至少保留一名有效管理员");
        }
    }

    public void requireManageableMembership(
            ActorScope scope,
            List<MemberRoleEntity> grants,
            Map<Long, RoleEntity> roles
    ) {
        if (!canManageMembership(scope, grants, roles)) {
            throw new BusinessException("MEMBER_GRANT_FORBIDDEN", "目标成员超出当前操作者的管理范围");
        }
    }

    public boolean statusRemovesAccess(MemberStatus status) {
        return status == MemberStatus.disabled || status == MemberStatus.removed;
    }

    private void requireClanScope(Long clanId, MemberRoleScopeType scopeType, Long scopeId) {
        if (scopeType != MemberRoleScopeType.clan || !clanId.equals(scopeId)) {
            throw new BusinessException("MEMBER_ROLE_SCOPE_INVALID", "该角色必须使用全宗族范围");
        }
    }

    private void requireBranchSubtreeScope(
            MemberRoleScopeType scopeType,
            Long scopeId,
            boolean branchBelongsToClan
    ) {
        if (scopeType != MemberRoleScopeType.branch_subtree || scopeId == null) {
            throw new BusinessException("MEMBER_ROLE_SCOPE_INVALID", "该角色必须使用支派及下级支派范围");
        }
        if (!branchBelongsToClan) {
            throw new BusinessException("BRANCH_CLAN_MISMATCH", "授权支派不属于当前宗族");
        }
    }
}
