package com.genealogy.auth.application;

import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.domain.ApprovedStatusPolicy;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import com.genealogy.member.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthorizationApplicationService {

    public static final String ROLE_CROSS_CLAN_ADMIN = "cross_clan_admin";
    public static final String ROLE_CLAN_ADMIN = "clan_admin";
    public static final String ROLE_BRANCH_ADMIN = "branch_admin";
    public static final String ROLE_EDITOR = "editor";
    public static final String ROLE_REVIEWER = "reviewer";
    public static final String ROLE_VIEWER = "viewer";

    private static final String STATUS_ACTIVE = "active";
    private static final Set<String> LEGACY_ATTACHMENT_CONTROLLER_PERMISSIONS = Set.of(
            "attachment:view",
            "attachment:download",
            "attachment:delete"
    );

    private final AuthApplicationService authApplicationService;
    private final ClanMembershipRepository clanMembershipRepository;
    private final MemberRoleRepository memberRoleRepository;
    private final RoleRepository roleRepository;
    private final BranchRepository branchRepository;
    private final RbacAuthorizationApplicationService rbacAuthorizationApplicationService;
    private final PermissionApplicationService permissionApplicationService;

    public AuthorizationApplicationService(
            AuthApplicationService authApplicationService,
            ClanMembershipRepository clanMembershipRepository,
            MemberRoleRepository memberRoleRepository,
            RoleRepository roleRepository,
            BranchRepository branchRepository,
            RbacAuthorizationApplicationService rbacAuthorizationApplicationService,
            PermissionApplicationService permissionApplicationService
    ) {
        this.authApplicationService = authApplicationService;
        this.clanMembershipRepository = clanMembershipRepository;
        this.memberRoleRepository = memberRoleRepository;
        this.roleRepository = roleRepository;
        this.branchRepository = branchRepository;
        this.rbacAuthorizationApplicationService = rbacAuthorizationApplicationService;
        this.permissionApplicationService = permissionApplicationService;
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
    public Long currentUserIdOrNull(String authorization) {
        return authApplicationService.currentUserIdOrNull(authorization);
    }

    @Transactional(readOnly = true)
    public Long requireClanMember(Long clanId, String authorization) {
        Long userId = requireLogin(authorization);
        requireClanMember(clanId, userId);
        return userId;
    }

    @Transactional(readOnly = true)
    public ClanMembershipEntity requireClanMember(Long clanId, Long userId) {
        if (userId == null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "请先登录");
        }
        if (isCrossClanAdmin(userId)) {
            return firstActiveMembership(userId).orElse(null);
        }
        return activeMembership(clanId, userId)
                .orElseThrow(() -> new BusinessException("AUTH_FORBIDDEN", "当前用户不是该宗族成员"));
    }

    /**
     * Requires a real active membership in the target clan. Unlike {@link #requireClanMember(Long, Long)},
     * this method deliberately does not grant a cross-clan administrator bypass. Use it for sensitive
     * read/export endpoints whose data must remain confined to clans the caller has explicitly joined.
     */
    @Transactional(readOnly = true)
    public ClanMembershipEntity requireDirectClanMember(Long clanId, Long userId) {
        if (userId == null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "请先登录");
        }
        if (clanId == null) {
            throw new BusinessException("VALIDATION_ERROR", "宗族不能为空");
        }
        return activeMembership(clanId, userId)
                .orElseThrow(() -> new BusinessException("AUTH_FORBIDDEN", "当前用户不是该宗族成员"));
    }

    /**
     * Requires both direct target-clan membership and an RBAC grant in that same clan. This prevents a
     * global/cross-clan role from implicitly satisfying a sensitive clan-local permission.
     */
    @Transactional(readOnly = true)
    public ClanMembershipEntity requireDirectClanPermission(Long clanId, Long userId, String permissionCode) {
        ClanMembershipEntity membership = requireDirectClanMember(clanId, userId);
        rbacAuthorizationApplicationService.requirePermission(userId, clanId, permissionCode);
        return membership;
    }

    @Transactional(readOnly = true)
    public boolean hasDirectClanPermission(Long clanId, Long userId, String permissionCode) {
        return rbacAuthorizationApplicationService.isActiveClanMember(userId, clanId)
                && rbacAuthorizationApplicationService.hasPermission(userId, clanId, permissionCode);
    }

    @Transactional(readOnly = true, noRollbackFor = BusinessException.class)
    public ClanMembershipEntity requirePermission(Long clanId, Long userId, String permissionCode) {
        if (userId == null) {
            if (isLegacyAttachmentControllerPermission(permissionCode)) {
                return null;
            }
            throw new BusinessException("AUTH_UNAUTHORIZED", "请先登录");
        }
        if (isCrossClanAdmin(userId)) {
            return firstActiveMembership(userId).orElse(null);
        }
        if (!rbacAuthorizationApplicationService.hasPermission(userId, clanId, permissionCode)) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限执行该操作");
        }
        return activeMembership(clanId, userId).orElse(null);
    }

    @Transactional(readOnly = true, noRollbackFor = BusinessException.class)
    public ClanMembershipEntity requireBranchPermission(Long clanId, Long userId, Long branchId, String permissionCode) {
        if (userId == null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "请先登录");
        }
        if (isCrossClanAdmin(userId)) {
            return firstActiveMembership(userId).orElse(null);
        }
        boolean allowed = branchId == null
                ? rbacAuthorizationApplicationService.hasPermission(userId, clanId, permissionCode, MemberRoleScopeType.clan, clanId)
                : rbacAuthorizationApplicationService.hasPermission(userId, clanId, permissionCode, MemberRoleScopeType.branch, branchId);
        if (!allowed) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限执行该操作");
        }
        return activeMembership(clanId, userId).orElse(null);
    }

    @Transactional(readOnly = true)
    public boolean can(Long clanId, Long userId, String permissionCode) {
        try {
            requirePermission(clanId, userId, permissionCode);
            return true;
        } catch (BusinessException ignored) {
            return false;
        }
    }

    public Set<String> permissionsForRoleCode(String roleCode) {
        return permissionApplicationService.permissionsForRoleCode(roleCode);
    }

    @Transactional(readOnly = true)
    public ClanMembershipEntity requireAnyRole(Long clanId, Long userId, String... roleCodes) {
        if (userId == null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "请先登录");
        }
        if (isCrossClanAdmin(userId)) {
            return firstActiveMembership(userId).orElse(null);
        }
        Set<String> allowed = Arrays.stream(roleCodes).collect(Collectors.toSet());
        boolean matched = activeRolesInClan(clanId, userId).stream()
                .map(this::roleCode)
                .anyMatch(allowed::contains);
        if (!matched) {
            throw new BusinessException("AUTH_FORBIDDEN", "当前角色无权执行该操作");
        }
        return activeMembership(clanId, userId).orElse(null);
    }

    @Transactional(readOnly = true)
    public ClanMembershipEntity requireBranchWriteScope(Long clanId, Long userId, Long branchId) {
        if (branchId != null) {
            String status = branchRepository.findByIdAndClanId(branchId, clanId)
                    .orElseThrow(() -> new BusinessException("BRANCH_NOT_FOUND", "支派不存在或不属于当前宗族"))
                    .getStatus();
            ApprovedStatusPolicy.requireApproved(status, "BRANCH_NOT_OFFICIAL", "支派审核通过后才能作为依赖对象");
        }
        return requireBranchPermission(clanId, userId, branchId, "person.update");
    }

    @Transactional(readOnly = true)
    public MemberRoleEntity requireBranchManagerCandidate(Long clanId, Long memberRoleId, Long branchId) {
        MemberRoleEntity memberRole = memberRoleRepository.findById(memberRoleId)
                .filter(item -> STATUS_ACTIVE.equals(item.getStatus()))
                .orElseThrow(() -> new BusinessException("BRANCH_MANAGER_NOT_FOUND", "支派负责人必须是有效成员授权"));
        ClanMembershipEntity membership = clanMembershipRepository.findById(memberRole.getMembershipId())
                .filter(item -> clanId.equals(item.getClanId()))
                .filter(item -> item.getMemberStatus() == MemberStatus.active)
                .orElseThrow(() -> new BusinessException("BRANCH_MANAGER_NOT_FOUND", "支派负责人必须是当前宗族有效成员"));
        String actualRoleCode = roleCode(memberRole);
        if (!ROLE_CLAN_ADMIN.equals(actualRoleCode) && !ROLE_BRANCH_ADMIN.equals(actualRoleCode) && !ROLE_EDITOR.equals(actualRoleCode)) {
            throw new BusinessException("BRANCH_MANAGER_ROLE_FORBIDDEN", "支派负责人必须具备宗族管理员、支派管理员或编辑角色");
        }
        if (branchId != null && !scopeCoversBranch(memberRole, branchId, clanId)) {
            throw new BusinessException("BRANCH_MANAGER_SCOPE_FORBIDDEN", "支派负责人授权范围不覆盖该支派");
        }
        return memberRole;
    }

    @Transactional(readOnly = true)
    public boolean isActiveClanMember(Long clanId, Long userId) {
        if (clanId == null || userId == null) {
            return false;
        }
        return isCrossClanAdmin(userId) || rbacAuthorizationApplicationService.isActiveClanMember(userId, clanId);
    }

    @Transactional(readOnly = true)
    public boolean isCrossClanAdmin(Long userId) {
        if (userId == null) {
            return false;
        }
        return activeMemberships(userId).stream()
                .flatMap(membership -> activeRoles(membership.getId()).stream())
                .map(this::roleCode)
                .anyMatch(ROLE_CROSS_CLAN_ADMIN::equals);
    }

    @Transactional(readOnly = true)
    public List<ClanMembershipEntity> activeMemberships(Long userId) {
        if (userId == null) {
            return List.of();
        }
        return clanMembershipRepository.findByUserIdAndMemberStatus(userId, MemberStatus.active);
    }

    @Transactional(readOnly = true)
    public void requireSingleClanOrCrossClanAdmin(Long userId, Long targetClanId) {
        if (userId == null || isCrossClanAdmin(userId)) {
            return;
        }
        boolean joinedAnotherClan = activeMemberships(userId).stream()
                .anyMatch(member -> targetClanId == null || !targetClanId.equals(member.getClanId()));
        if (joinedAnotherClan) {
            throw new BusinessException("USER_ALREADY_JOINED_ANOTHER_CLAN", "一个用户只能归属一个宗族；如需跨宗族管理，请授予跨宗族管理员角色");
        }
    }

    private Optional<ClanMembershipEntity> activeMembership(Long clanId, Long userId) {
        return clanMembershipRepository.findByClanIdAndUserIdAndMemberStatus(clanId, userId, MemberStatus.active);
    }

    private Optional<ClanMembershipEntity> firstActiveMembership(Long userId) {
        return activeMemberships(userId).stream().findFirst();
    }

    private List<MemberRoleEntity> activeRolesInClan(Long clanId, Long userId) {
        return activeMembership(clanId, userId)
                .map(membership -> activeRoles(membership.getId()))
                .orElseGet(List::of);
    }

    private List<MemberRoleEntity> activeRoles(Long membershipId) {
        return memberRoleRepository.findByMembershipIdAndStatus(membershipId, STATUS_ACTIVE);
    }

    private String roleCode(MemberRoleEntity memberRole) {
        return roleRepository.findById(memberRole.getRoleId())
                .map(RoleEntity::getRoleCode)
                .orElseThrow(() -> new BusinessException("ROLE_NOT_FOUND", "成员角色不存在"));
    }

    private boolean scopeCoversBranch(MemberRoleEntity memberRole, Long branchId, Long clanId) {
        if (memberRole.getScopeType() == MemberRoleScopeType.clan || memberRole.getScopeType() == MemberRoleScopeType.global) {
            return true;
        }
        if (memberRole.getScopeType() == MemberRoleScopeType.branch) {
            return memberRole.getScopeId().equals(branchId);
        }
        if (memberRole.getScopeType() == MemberRoleScopeType.branch_subtree) {
            return branchRepository.isDescendantOrSelf(clanId, memberRole.getScopeId(), branchId);
        }
        return false;
    }

    private boolean isLegacyAttachmentControllerPermission(String permissionCode) {
        return LEGACY_ATTACHMENT_CONTROLLER_PERMISSIONS.contains(permissionCode);
    }
}
