package com.genealogy.auth.application;

import com.genealogy.branch.domain.BranchScopeDomainService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final BranchScopeDomainService branchScopeDomainService;

    public RbacAuthorizationApplicationService(
            AuthApplicationService authApplicationService,
            PermissionApplicationService permissionApplicationService,
            ClanMembershipRepository clanMembershipRepository,
            MemberRoleRepository memberRoleRepository,
            BranchScopeDomainService branchScopeDomainService
    ) {
        this.authApplicationService = authApplicationService;
        this.permissionApplicationService = permissionApplicationService;
        this.clanMembershipRepository = clanMembershipRepository;
        this.memberRoleRepository = memberRoleRepository;
        this.branchScopeDomainService = branchScopeDomainService;
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
        List<ClanMembershipEntity> memberships = clanMembershipRepository.findByClanIdAndUserIdAndMemberStatus(clanId, userId, MemberStatus.active)
                .stream()
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
        List<ClanMembershipEntity> memberships = clanMembershipRepository.findByClanIdAndUserIdAndMemberStatus(clanId, userId, MemberStatus.active)
                .stream()
                .toList();
        if (memberships.isEmpty()) {
            return Set.of();
        }
        List<Long> membershipIds = memberships.stream().map(ClanMembershipEntity::getId).toList();
        return memberRoleRepository.findByMembershipIdInAndStatus(membershipIds, STATUS_ACTIVE).stream()
                .flatMap(memberRole -> permissionApplicationService.permissionsForRoleId(memberRole.getRoleId()).stream())
                .collect(Collectors.toUnmodifiableSet());
    }

    @Transactional(readOnly = true)
    public boolean scopeCovers(
            Long clanId,
            MemberRoleEntity role,
            MemberRoleScopeType targetScopeType,
            Long targetScopeId
    ) {
        if (targetScopeType == null || targetScopeId == null) {
            return true;
        }
        return branchScopeDomainService.scopeCovers(
                clanId,
                role.getScopeType(),
                role.getScopeId(),
                targetScopeType,
                targetScopeId
        );
    }
}
