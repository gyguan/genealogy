package com.genealogy.auth.application;

import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RbacAuthorizationApplicationService {

    private static final String STATUS_ACTIVE = "active";

    private final AuthApplicationService authApplicationService;
    private final PermissionApplicationService permissionApplicationService;
    private final ClanMembershipRepository clanMembershipRepository;
    private final MemberRoleRepository memberRoleRepository;
    private final BranchRepository branchRepository;

    public RbacAuthorizationApplicationService(
            AuthApplicationService authApplicationService,
            PermissionApplicationService permissionApplicationService,
            ClanMembershipRepository clanMembershipRepository,
            MemberRoleRepository memberRoleRepository,
            BranchRepository branchRepository
    ) {
        this.authApplicationService = authApplicationService;
        this.permissionApplicationService = permissionApplicationService;
        this.clanMembershipRepository = clanMembershipRepository;
        this.memberRoleRepository = memberRoleRepository;
        this.branchRepository = branchRepository;
    }

    @Transactional(readOnly = true)
    public Long requireLogin(String authorization) {
        Long userId = authApplicationService.currentUserIdOrNull(authorization);
        if (userId == null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "请先登录");
        }
        return userId;
    }

    @Transactional(readOnly = true)
    public boolean isActiveClanMember(Long userId, Long clanId) {
        if (userId == null || clanId == null) {
            return false;
        }
        return clanMembershipRepository.existsByClanIdAndUserIdAndMemberStatus(clanId, userId, MemberStatus.active);
    }

    @Transactional(readOnly = true)
    public boolean hasPermission(Long userId, Long clanId, String permissionCode) {
        return hasPermission(userId, clanId, permissionCode, null, null);
    }

    @Transactional(readOnly = true)
    public boolean hasPermission(Long userId, Long clanId, String permissionCode, MemberRoleScopeType targetScopeType, Long targetScopeId) {
        if (userId == null || clanId == null || permissionCode == null || permissionCode.isBlank()) {
            return false;
        }
        List<ClanMembershipEntity> memberships = clanMembershipRepository.findByClanIdAndUserIdAndMemberStatus(clanId, userId)
                .stream()
                .filter(membership -> membership.getMemberStatus() == MemberStatus.active)
                .toList();
        if (memberships.isEmpty()) {
            return false;
        }
        List<Long> membershipIds = memberships.stream().map(ClanMembershipEntity::getId).toList();
        return memberRoleRepository.findByMembershipIdInAndStatus(membershipIds, STATUS_ACTIVE).stream()
                .filter(role -> permissionApplicationService.roleHasPermission(role.getRoleId(), permissionCode))
                .anyMatch(role -> scopeCovers(clanId, role, targetScopeType, targetScopeId));
    }

    @Transactional(readOnly = true)
    public PermissionDataScope permissionDataScope(Long userId, Long clanId, String permissionCode) {
        if (userId == null || clanId == null || permissionCode == null || permissionCode.isBlank()) {
            return PermissionDataScope.none();
        }
        List<ClanMembershipEntity> memberships = clanMembershipRepository
                .findByClanIdAndUserIdAndMemberStatus(clanId, userId, MemberStatus.active)
                .stream()
                .toList();
        if (memberships.isEmpty()) {
            return PermissionDataScope.none();
        }
        List<MemberRoleEntity> grants = memberRoleRepository.findByMembershipIdInAndStatus(
                        memberships.stream().map(ClanMembershipEntity::getId).toList(),
                        STATUS_ACTIVE
                ).stream()
                .filter(grant -> permissionApplicationService.roleHasPermission(grant.getRoleId(), permissionCode))
                .toList();

        boolean fullClanAccess = grants.stream().anyMatch(grant ->
                grant.getScopeType() == MemberRoleScopeType.global
                        || grant.getScopeType() == MemberRoleScopeType.clan && clanId.equals(grant.getScopeId())
        );
        if (fullClanAccess) {
            return PermissionDataScope.full();
        }

        Set<Long> visibleBranchIds = new LinkedHashSet<>();
        Set<Long> subtreeRoots = new LinkedHashSet<>();
        grants.forEach(grant -> {
            if (grant.getScopeId() == null) {
                return;
            }
            if (grant.getScopeType() == MemberRoleScopeType.branch) {
                visibleBranchIds.add(grant.getScopeId());
            } else if (grant.getScopeType() == MemberRoleScopeType.branch_subtree) {
                subtreeRoots.add(grant.getScopeId());
            }
        });
        if (!subtreeRoots.isEmpty()) {
            visibleBranchIds.addAll(branchRepository.findSubtreeIds(clanId, subtreeRoots));
        }
        return PermissionDataScope.branches(visibleBranchIds);
    }

    @Transactional(readOnly = true)
    public void requirePermission(Long userId, Long clanId, String permissionCode) {
        requirePermission(userId, clanId, permissionCode, null, null);
    }

    @Transactional(readOnly = true)
    public void requirePermission(Long userId, Long clanId, String permissionCode, MemberRoleScopeType targetScopeType, Long targetScopeId) {
        if (!hasPermission(userId, clanId, permissionCode, targetScopeType, targetScopeId)) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限执行该操作");
        }
    }

    @Transactional(readOnly = true)
    public Set<String> permissionCodesForUserInClan(Long userId, Long clanId) {
        if (userId == null || clanId == null) {
            return Set.of();
        }
        List<ClanMembershipEntity> memberships = clanMembershipRepository.findByClanIdAndUserIdAndMemberStatus(clanId, userId)
                .stream()
                .filter(membership -> membership.getMemberStatus() == MemberStatus.active)
                .toList();
        if (memberships.isEmpty()) {
            return Set.of();
        }
        List<Long> membershipIds = memberships.stream().map(ClanMembershipEntity::getId).toList();
        return memberRoleRepository.findByMembershipIdInAndStatus(membershipIds, STATUS_ACTIVE).stream()
                .flatMap(memberRole -> permissionApplicationService.permissionsForRoleId(memberRole.getRoleId()).stream())
                .collect(Collectors.toUnmodifiableSet());
    }

    private boolean scopeCovers(Long clanId, MemberRoleEntity role, MemberRoleScopeType targetScopeType, Long targetScopeId) {
        if (targetScopeType == null || targetScopeId == null) {
            return true;
        }
        if (role.getScopeType() == MemberRoleScopeType.global) {
            return true;
        }
        if (role.getScopeType() == MemberRoleScopeType.clan) {
            return targetScopeType == MemberRoleScopeType.clan && role.getScopeId().equals(targetScopeId)
                    || isBranchTarget(targetScopeType) && role.getScopeId().equals(clanId)
                    || targetScopeType == MemberRoleScopeType.self && role.getScopeId().equals(clanId);
        }
        if (role.getScopeType() == MemberRoleScopeType.branch) {
            return isBranchTarget(targetScopeType) && role.getScopeId().equals(targetScopeId);
        }
        if (role.getScopeType() == MemberRoleScopeType.branch_subtree) {
            return isBranchTarget(targetScopeType)
                    && branchRepository.isDescendantOrSelf(clanId, role.getScopeId(), targetScopeId);
        }
        if (role.getScopeType() == MemberRoleScopeType.self) {
            return targetScopeType == MemberRoleScopeType.self && role.getScopeId().equals(targetScopeId);
        }
        return false;
    }

    private boolean isBranchTarget(MemberRoleScopeType targetScopeType) {
        return targetScopeType == MemberRoleScopeType.branch || targetScopeType == MemberRoleScopeType.branch_subtree;
    }

    public record PermissionDataScope(boolean fullClanAccess, Set<Long> visibleBranchIds) {

        public PermissionDataScope {
            visibleBranchIds = visibleBranchIds == null ? Set.of() : Set.copyOf(visibleBranchIds);
        }

        public static PermissionDataScope full() {
            return new PermissionDataScope(true, Set.of());
        }

        public static PermissionDataScope branches(Set<Long> branchIds) {
            return new PermissionDataScope(false, branchIds);
        }

        public static PermissionDataScope none() {
            return new PermissionDataScope(false, Set.of());
        }

        public boolean canAccessBranch(Long branchId) {
            return fullClanAccess || branchId != null && visibleBranchIds.contains(branchId);
        }

        public List<Long> queryVisibleBranchIds() {
            return visibleBranchIds.isEmpty() ? List.of(-1L) : visibleBranchIds.stream().sorted().toList();
        }
    }
}
