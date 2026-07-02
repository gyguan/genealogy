package com.genealogy.auth.application;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.entity.ClanMemberEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMemberRepository;
import com.genealogy.member.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
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

    private static final String ALL_PERMISSIONS = "*";
    private static final Map<String, Set<String>> ROLE_PERMISSIONS = Map.of(
            ROLE_CROSS_CLAN_ADMIN, Set.of(ALL_PERMISSIONS),
            ROLE_CLAN_ADMIN, Set.of(
                    "clan:view", "clan:update", "clan:manage_settings", "clan:delete",
                    "member:invite", "member:update_role", "member:disable", "member:transfer_owner",
                    "branch:view", "branch:create", "branch:update", "branch:delete",
                    "person:view", "person:create", "person:update", "person:delete", "person:submit_review",
                    "relationship:view", "relationship:create", "relationship:update", "relationship:delete", "relationship:check_conflict", "relationship:submit_review",
                    "source:view", "source:create", "source:update", "source:delete", "source:bind",
                    "attachment:view", "attachment:upload", "attachment:preview", "attachment:download", "attachment:delete",
                    "review_task:view", "review_task:approve", "review_task:reject", "review_task:assign",
                    "export_task:create", "export_task:approve", "export_task:download",
                    "operation_log:view", "operation_log:export"
            ),
            ROLE_BRANCH_ADMIN, Set.of(
                    "clan:view",
                    "branch:view", "branch:create", "branch:update",
                    "person:view", "person:create", "person:update", "person:submit_review",
                    "relationship:view", "relationship:create", "relationship:update", "relationship:check_conflict", "relationship:submit_review",
                    "source:view", "source:create", "source:update", "source:bind",
                    "attachment:view", "attachment:upload", "attachment:preview", "attachment:download",
                    "review_task:view",
                    "export_task:create"
            ),
            ROLE_EDITOR, Set.of(
                    "clan:view", "branch:view",
                    "person:view", "person:create", "person:update", "person:submit_review",
                    "relationship:view", "relationship:create", "relationship:update", "relationship:check_conflict", "relationship:submit_review",
                    "source:view", "source:create", "source:update", "source:bind",
                    "attachment:view", "attachment:upload", "attachment:preview", "attachment:download",
                    "review_task:view"
            ),
            ROLE_REVIEWER, Set.of(
                    "clan:view", "branch:view", "person:view", "relationship:view", "source:view",
                    "attachment:view", "attachment:preview",
                    "review_task:view", "review_task:approve", "review_task:reject"
            ),
            ROLE_VIEWER, Set.of(
                    "clan:view", "branch:view", "person:view", "relationship:view", "source:view",
                    "attachment:view", "attachment:preview"
            )
    );

    private final AuthApplicationService authApplicationService;
    private final ClanMemberRepository clanMemberRepository;
    private final RoleRepository roleRepository;
    private final BranchRepository branchRepository;

    public AuthorizationApplicationService(
            AuthApplicationService authApplicationService,
            ClanMemberRepository clanMemberRepository,
            RoleRepository roleRepository,
            BranchRepository branchRepository
    ) {
        this.authApplicationService = authApplicationService;
        this.clanMemberRepository = clanMemberRepository;
        this.roleRepository = roleRepository;
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
    public ClanMemberEntity requireClanMember(Long clanId, Long userId) {
        if (userId == null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "请先登录");
        }
        Optional<ClanMemberEntity> crossClanAdmin = findActiveCrossClanAdminMember(userId);
        if (crossClanAdmin.isPresent()) {
            return crossClanAdmin.get();
        }
        requirePrimaryClan(clanId, userId);
        return activeMembersInClan(clanId, userId).stream()
                .findFirst()
                .orElseThrow(() -> new BusinessException("AUTH_FORBIDDEN", "当前用户不是该宗族成员"));
    }

    @Transactional(readOnly = true)
    public ClanMemberEntity requirePermission(Long clanId, Long userId, String permissionCode) {
        if (userId == null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "请先登录");
        }
        Optional<ClanMemberEntity> crossClanAdmin = findActiveCrossClanAdminMember(userId);
        if (crossClanAdmin.isPresent() && roleAllows(roleCode(crossClanAdmin.get()), permissionCode)) {
            return crossClanAdmin.get();
        }
        requirePrimaryClan(clanId, userId);
        return activeMembersInClan(clanId, userId).stream()
                .filter(member -> roleAllows(roleCode(member), permissionCode))
                .findFirst()
                .orElseThrow(() -> new BusinessException("AUTH_FORBIDDEN", "您暂无权限执行该操作"));
    }

    @Transactional(readOnly = true)
    public ClanMemberEntity requireBranchPermission(Long clanId, Long userId, Long branchId, String permissionCode) {
        if (userId == null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "请先登录");
        }
        Optional<ClanMemberEntity> crossClanAdmin = findActiveCrossClanAdminMember(userId);
        if (crossClanAdmin.isPresent() && roleAllows(roleCode(crossClanAdmin.get()), permissionCode)) {
            return crossClanAdmin.get();
        }
        requirePrimaryClan(clanId, userId);
        List<ClanMemberEntity> candidates = activeMembersInClan(clanId, userId).stream()
                .filter(member -> roleAllows(roleCode(member), permissionCode))
                .toList();
        if (candidates.isEmpty()) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限执行该操作");
        }
        Optional<ClanMemberEntity> clanScoped = candidates.stream()
                .filter(member -> member.getScopeType() == MemberScopeType.clan)
                .findFirst();
        if (clanScoped.isPresent()) {
            return clanScoped.get();
        }
        if (branchId == null) {
            throw new BusinessException("AUTH_BRANCH_SCOPE_REQUIRED", "该操作需要明确授权支派范围");
        }
        return candidates.stream()
                .filter(member -> isMemberBranchInScope(clanId, member, branchId))
                .findFirst()
                .orElseThrow(() -> new BusinessException("AUTH_BRANCH_SCOPE_FORBIDDEN", "当前用户无权维护该支派范围的数据"));
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
        return Set.copyOf(ROLE_PERMISSIONS.getOrDefault(roleCode, Set.of()));
    }

    @Transactional(readOnly = true)
    public ClanMemberEntity requireAnyRole(Long clanId, Long userId, String... roleCodes) {
        if (userId == null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "请先登录");
        }
        Optional<ClanMemberEntity> crossClanAdmin = findActiveCrossClanAdminMember(userId);
        if (crossClanAdmin.isPresent()) {
            return crossClanAdmin.get();
        }
        requirePrimaryClan(clanId, userId);
        Set<String> allowed = Arrays.stream(roleCodes).collect(Collectors.toSet());
        return activeMembersInClan(clanId, userId).stream()
                .filter(member -> allowed.contains(roleCode(member)))
                .findFirst()
                .orElseThrow(() -> new BusinessException("AUTH_FORBIDDEN", "当前角色无权执行该操作"));
    }

    @Transactional(readOnly = true)
    public ClanMemberEntity requireBranchWriteScope(Long clanId, Long userId, Long branchId) {
        if (userId == null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "请先登录");
        }
        Optional<ClanMemberEntity> crossClanAdmin = findActiveCrossClanAdminMember(userId);
        if (crossClanAdmin.isPresent()) {
            return crossClanAdmin.get();
        }
        requirePrimaryClan(clanId, userId);
        Optional<ClanMemberEntity> clanAdmin = activeMembersInClan(clanId, userId).stream()
                .filter(member -> ROLE_CLAN_ADMIN.equals(roleCode(member)))
                .findFirst();
        if (clanAdmin.isPresent()) {
            return clanAdmin.get();
        }
        List<ClanMemberEntity> candidates = activeMembersInClan(clanId, userId).stream()
                .filter(member -> {
                    String actualRoleCode = roleCode(member);
                    return ROLE_BRANCH_ADMIN.equals(actualRoleCode) || ROLE_EDITOR.equals(actualRoleCode);
                })
                .toList();
        if (candidates.isEmpty()) {
            throw new BusinessException("AUTH_FORBIDDEN", "当前角色无权维护该支派数据");
        }
        Optional<ClanMemberEntity> clanScoped = candidates.stream()
                .filter(member -> member.getScopeType() == MemberScopeType.clan)
                .findFirst();
        if (clanScoped.isPresent()) {
            return clanScoped.get();
        }
        if (branchId == null) {
            throw new BusinessException("AUTH_BRANCH_SCOPE_REQUIRED", "该操作需要明确授权支派范围");
        }
        return candidates.stream()
                .filter(member -> isMemberBranchInScope(clanId, member, branchId))
                .findFirst()
                .orElseThrow(() -> new BusinessException("AUTH_BRANCH_SCOPE_FORBIDDEN", "当前用户无权维护该支派范围的数据"));
    }

    @Transactional(readOnly = true)
    public ClanMemberEntity requireBranchManagerCandidate(Long clanId, Long memberId, Long branchId) {
        ClanMemberEntity member = clanMemberRepository.findById(memberId)
                .filter(item -> clanId.equals(item.getClanId()))
                .orElseThrow(() -> new BusinessException("BRANCH_MANAGER_NOT_FOUND", "支派负责人必须是当前宗族成员"));
        if (member.getMemberStatus() != MemberStatus.active) {
            throw new BusinessException("BRANCH_MANAGER_INACTIVE", "支派负责人不是有效宗族成员");
        }
        String actualRoleCode = roleCode(member);
        if (!ROLE_CROSS_CLAN_ADMIN.equals(actualRoleCode) && !ROLE_CLAN_ADMIN.equals(actualRoleCode) && !ROLE_BRANCH_ADMIN.equals(actualRoleCode) && !ROLE_EDITOR.equals(actualRoleCode)) {
            throw new BusinessException("BRANCH_MANAGER_ROLE_FORBIDDEN", "支派负责人必须具备跨宗族管理员、宗族管理员、支派管理员或编辑角色");
        }
        return requireBranchWriteScope(clanId, member.getUserId(), branchId);
    }

    @Transactional(readOnly = true)
    public boolean isActiveClanMember(Long clanId, Long userId) {
        if (clanId == null || userId == null) {
            return false;
        }
        if (isCrossClanAdmin(userId)) {
            return true;
        }
        return primaryClanId(userId).filter(clanId::equals).isPresent()
                && !activeMembersInClan(clanId, userId).isEmpty();
    }

    @Transactional(readOnly = true)
    public boolean isCrossClanAdmin(Long userId) {
        return findActiveCrossClanAdminMember(userId).isPresent();
    }

    @Transactional(readOnly = true)
    public List<ClanMemberEntity> activeMemberships(Long userId) {
        if (userId == null) {
            return List.of();
        }
        List<ClanMemberEntity> memberships = rawActiveMemberships(userId);
        if (findActiveCrossClanAdminMember(userId).isPresent()) {
            return memberships;
        }
        return memberships.stream().findFirst().stream().toList();
    }

    @Transactional(readOnly = true)
    public void requireSingleClanOrCrossClanAdmin(Long userId, Long targetClanId) {
        if (userId == null || isCrossClanAdmin(userId)) {
            return;
        }
        List<ClanMemberEntity> activeMemberships = rawActiveMemberships(userId);
        boolean joinedAnotherClan = activeMemberships.stream()
                .anyMatch(member -> targetClanId == null || !targetClanId.equals(member.getClanId()));
        if (joinedAnotherClan) {
            throw new BusinessException("USER_ALREADY_JOINED_ANOTHER_CLAN", "一个用户只能归属一个宗族；如需跨宗族管理，请授予跨宗族管理员角色");
        }
    }

    private void requirePrimaryClan(Long clanId, Long userId) {
        Long primaryClanId = primaryClanId(userId).orElse(null);
        if (primaryClanId == null || !primaryClanId.equals(clanId)) {
            throw new BusinessException("AUTH_FORBIDDEN", "当前用户无权访问该宗族");
        }
    }

    private List<ClanMemberEntity> activeMembersInClan(Long clanId, Long userId) {
        if (clanId == null || userId == null) {
            return List.of();
        }
        return rawActiveMemberships(userId).stream()
                .filter(member -> clanId.equals(member.getClanId()))
                .toList();
    }

    private Optional<ClanMemberEntity> findActiveCrossClanAdminMember(Long userId) {
        if (userId == null) {
            return Optional.empty();
        }
        return rawActiveMemberships(userId).stream()
                .filter(member -> ROLE_CROSS_CLAN_ADMIN.equals(roleCode(member)))
                .findFirst();
    }

    private Optional<Long> primaryClanId(Long userId) {
        return rawActiveMemberships(userId).stream()
                .findFirst()
                .map(ClanMemberEntity::getClanId);
    }

    private List<ClanMemberEntity> rawActiveMemberships(Long userId) {
        return clanMemberRepository.findByUserIdAndMemberStatus(userId, MemberStatus.active).stream()
                .sorted(Comparator
                        .comparing((ClanMemberEntity member) -> member.getJoinedAt() == null ? LocalDateTime.MAX : member.getJoinedAt())
                        .thenComparing(ClanMemberEntity::getId))
                .toList();
    }

    private boolean isMemberBranchInScope(Long clanId, ClanMemberEntity member, Long branchId) {
        Long allowedBranchId = member.getScopeId() == null ? member.getBranchId() : member.getScopeId();
        return isBranchInScope(clanId, branchId, allowedBranchId, member.getScopeType());
    }

    private boolean isBranchInScope(Long clanId, Long branchId, Long allowedBranchId, MemberScopeType scopeType) {
        if (branchId == null || allowedBranchId == null) {
            return false;
        }
        if (allowedBranchId.equals(branchId)) {
            return true;
        }
        if (scopeType != MemberScopeType.branch_subtree) {
            return false;
        }
        BranchEntity allowedBranch = branchRepository.findByIdAndClanId(allowedBranchId, clanId)
                .orElseThrow(() -> new BusinessException("AUTH_BRANCH_SCOPE_INVALID", "授权支派不存在或不属于当前宗族"));
        BranchEntity targetBranch = branchRepository.findByIdAndClanId(branchId, clanId)
                .orElseThrow(() -> new BusinessException("BRANCH_NOT_FOUND", "目标支派不存在或不属于当前宗族"));
        String allowedPath = allowedBranch.getBranchPath();
        String targetPath = targetBranch.getBranchPath();
        if (allowedPath == null || allowedPath.isBlank() || targetPath == null || targetPath.isBlank()) {
            return false;
        }
        return targetPath.equals(allowedPath) || targetPath.startsWith(allowedPath + "/");
    }

    private boolean roleAllows(String roleCode, String permissionCode) {
        Set<String> permissions = ROLE_PERMISSIONS.getOrDefault(roleCode, Set.of());
        if (permissions.contains(ALL_PERMISSIONS) || permissions.contains(permissionCode)) {
            return true;
        }
        int separator = permissionCode == null ? -1 : permissionCode.indexOf(':');
        return separator > 0 && permissions.contains(permissionCode.substring(0, separator) + ":*");
    }

    private String roleCode(ClanMemberEntity member) {
        return roleRepository.findById(member.getRoleId())
                .map(RoleEntity::getRoleCode)
                .orElseThrow(() -> new BusinessException("ROLE_NOT_FOUND", "成员角色不存在"));
    }
}
