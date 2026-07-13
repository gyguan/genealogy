package com.genealogy.member.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.domain.MemberGrantPolicyService;
import com.genealogy.member.domain.MemberGrantPolicyService.ActorScope;
import com.genealogy.member.dto.CreateMemberGrantRequest;
import com.genealogy.member.dto.GrantableRoleResponse;
import com.genealogy.member.dto.MemberAggregateResponse;
import com.genealogy.member.dto.MemberAllowedActionsResponse;
import com.genealogy.member.dto.MemberCandidateResponse;
import com.genealogy.member.dto.MemberGrantResponse;
import com.genealogy.member.dto.UpdateMemberGrantRequest;
import com.genealogy.member.dto.UpdateMemberStatusRequest;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import com.genealogy.member.repository.RoleRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class MemberPermissionApplicationService {

    private static final String STATUS_ACTIVE = "active";
    private static final String STATUS_REVOKED = "revoked";
    private static final String JOIN_STATUS_JOINED = "joined";
    private static final Set<String> HIGH_RISK_ROLES = Set.of(
            AuthorizationApplicationService.ROLE_CLAN_ADMIN,
            AuthorizationApplicationService.ROLE_REVIEWER
    );

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final ClanMembershipRepository clanMembershipRepository;
    private final MemberRoleRepository memberRoleRepository;
    private final BranchRepository branchRepository;
    private final MemberGrantPolicyService memberGrantPolicyService;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;

    public MemberPermissionApplicationService(
            AppUserRepository appUserRepository,
            RoleRepository roleRepository,
            ClanMembershipRepository clanMembershipRepository,
            MemberRoleRepository memberRoleRepository,
            BranchRepository branchRepository,
            MemberGrantPolicyService memberGrantPolicyService,
            AuthorizationApplicationService authorizationApplicationService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.appUserRepository = appUserRepository;
        this.roleRepository = roleRepository;
        this.clanMembershipRepository = clanMembershipRepository;
        this.memberRoleRepository = memberRoleRepository;
        this.branchRepository = branchRepository;
        this.memberGrantPolicyService = memberGrantPolicyService;
        this.authorizationApplicationService = authorizationApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
    }

    @Transactional(readOnly = true)
    public PageResponse<MemberAggregateResponse> members(
            Long clanId,
            Long actorId,
            String keyword,
            String roleCode,
            String scopeType,
            String status,
            int pageNo,
            int pageSize
    ) {
        int normalizedPageNo = Math.max(1, pageNo);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, 100));
        Pageable pageable = PageRequest.of(
                normalizedPageNo - 1,
                normalizedPageSize,
                Sort.by(Sort.Direction.ASC, "id")
        );
        ActorScope actorScope = memberGrantPolicyService.actorScope(clanId, actorId);
        Page<ClanMembershipEntity> membershipPage = clanMembershipRepository.searchMembers(
                clanId,
                normalizeFilter(keyword),
                normalizeFilter(roleCode),
                parseOptionalScopeType(scopeType),
                parseOptionalMemberStatus(status),
                actorScope.fullClanAccess(),
                MemberRoleScopeType.branch,
                MemberRoleScopeType.branch_subtree,
                actorScope.queryVisibleBranchIds(),
                actorScope.queryVisibleSubtreeIds(),
                pageable
        );
        List<MemberAggregateResponse> records = aggregateMembers(
                clanId,
                actorId,
                actorScope,
                membershipPage.getContent()
        );
        return PageResponse.of(records, membershipPage.getTotalElements(), normalizedPageNo, normalizedPageSize);
    }

    @Transactional(readOnly = true)
    public PageResponse<MemberCandidateResponse> candidates(
            Long clanId,
            String keyword,
            int pageNo,
            int pageSize
    ) {
        String normalizedKeyword = normalizeFilter(keyword);
        if (normalizedKeyword == null || normalizedKeyword.length() < 2) {
            throw new BusinessException("MEMBER_CANDIDATE_KEYWORD_REQUIRED", "请输入至少两个字符搜索候选成员");
        }
        int normalizedPageNo = Math.max(1, pageNo);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, 50));
        Page<AppUserEntity> userPage = appUserRepository.searchActiveCandidates(
                normalizedKeyword,
                PageRequest.of(normalizedPageNo - 1, normalizedPageSize)
        );
        List<Long> userIds = userPage.getContent().stream().map(AppUserEntity::getId).toList();
        Set<Long> existingUserIds = userIds.isEmpty()
                ? Set.of()
                : clanMembershipRepository.findByClanIdAndUserIdIn(clanId, userIds).stream()
                        .map(ClanMembershipEntity::getUserId)
                        .collect(Collectors.toSet());
        List<MemberCandidateResponse> records = userPage.getContent().stream()
                .map(user -> new MemberCandidateResponse(
                        user.getId(),
                        user.getDisplayName(),
                        maskAccount(user.getUsername()),
                        existingUserIds.contains(user.getId())
                ))
                .toList();
        return PageResponse.of(records, userPage.getTotalElements(), normalizedPageNo, normalizedPageSize);
    }

    @Transactional(readOnly = true)
    public List<GrantableRoleResponse> grantableRoles(Long clanId, Long actorId) {
        List<String> roleCodes = memberGrantPolicyService.grantableRoleCodes(clanId, actorId);
        if (roleCodes.isEmpty()) {
            return List.of();
        }
        return roleRepository.findAll().stream()
                .filter(role -> roleCodes.contains(role.getRoleCode()))
                .sorted(Comparator.comparing(RoleEntity::getId))
                .map(this::toGrantableRoleResponse)
                .toList();
    }

    @Transactional
    public MemberGrantResponse createGrant(Long clanId, Long actorId, CreateMemberGrantRequest request) {
        RoleEntity role = requireRole(request.roleCode());
        MemberRoleScopeType scopeType = parseWriteScopeType(request.scopeType());
        memberGrantPolicyService.validateCreate(
                clanId,
                actorId,
                role.getRoleCode(),
                scopeType,
                request.scopeId(),
                request.reason()
        );
        AppUserEntity user = appUserRepository.findById(request.userId())
                .filter(candidate -> candidate.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException("USER_NOT_FOUND", "候选用户不存在"));
        ClanMembershipEntity membership = findOrCreateMembership(
                clanId,
                user.getId(),
                actorId,
                request.reason()
        );
        if (memberRoleRepository.existsByMembershipIdAndRoleIdAndScopeTypeAndScopeIdAndStatus(
                membership.getId(), role.getId(), scopeType, request.scopeId(), STATUS_ACTIVE
        )) {
            throw new BusinessException("MEMBER_GRANT_DUPLICATED", "成员已拥有相同角色和范围的有效授权");
        }

        LocalDateTime now = LocalDateTime.now();
        MemberRoleEntity grant = new MemberRoleEntity();
        grant.setMembershipId(membership.getId());
        grant.setRoleId(role.getId());
        grant.setScopeType(scopeType);
        grant.setScopeId(request.scopeId());
        grant.setStatus(STATUS_ACTIVE);
        grant.setGrantedBy(actorId);
        grant.setGrantedAt(now);
        grant.setCreatedBy(actorId);
        grant.setCreatedAt(now);
        grant.setUpdatedBy(actorId);
        grant.setUpdatedAt(now);
        MemberRoleEntity saved = memberRoleRepository.save(grant);
        recordGrantChange(clanId, actorId, "member_grant_create", saved, role, null, request.reason());
        return grantResponseForActor(clanId, actorId, saved, role, scopeName(clanId, saved));
    }

    @Transactional
    public MemberGrantResponse updateGrant(
            Long clanId,
            Long actorId,
            Long grantId,
            UpdateMemberGrantRequest request
    ) {
        MemberRoleEntity grant = requireGrantInClan(clanId, grantId);
        RoleEntity oldRole = requireRole(grant.getRoleId());
        RoleEntity targetRole = requireRole(request.roleCode());
        MemberRoleScopeType targetScopeType = parseWriteScopeType(request.scopeType());
        memberGrantPolicyService.validateUpdate(
                clanId,
                actorId,
                grant,
                targetRole.getRoleCode(),
                targetScopeType,
                request.scopeId(),
                request.reason()
        );
        memberRoleRepository.findByMembershipIdAndRoleIdAndScopeTypeAndScopeId(
                        grant.getMembershipId(), targetRole.getId(), targetScopeType, request.scopeId()
                )
                .filter(existing -> !existing.getId().equals(grantId))
                .filter(existing -> STATUS_ACTIVE.equals(existing.getStatus()))
                .ifPresent(existing -> {
                    throw new BusinessException("MEMBER_GRANT_DUPLICATED", "成员已拥有相同角色和范围的有效授权");
                });
        String before = grantSnapshot(grant, oldRole);
        grant.setRoleId(targetRole.getId());
        grant.setScopeType(targetScopeType);
        grant.setScopeId(request.scopeId());
        grant.setStatus(STATUS_ACTIVE);
        grant.setRevokedAt(null);
        grant.setUpdatedBy(actorId);
        grant.setUpdatedAt(LocalDateTime.now());
        MemberRoleEntity saved = memberRoleRepository.save(grant);
        recordGrantChange(clanId, actorId, "member_grant_update", saved, targetRole, before, request.reason());
        return grantResponseForActor(clanId, actorId, saved, targetRole, scopeName(clanId, saved));
    }

    @Transactional
    public void revokeGrant(Long clanId, Long actorId, Long grantId, String reason) {
        MemberRoleEntity grant = requireGrantInClan(clanId, grantId);
        RoleEntity role = requireRole(grant.getRoleId());
        memberGrantPolicyService.validateRevoke(clanId, actorId, grant, reason);
        String before = grantSnapshot(grant, role);
        grant.setStatus(STATUS_REVOKED);
        grant.setRevokedAt(LocalDateTime.now());
        grant.setUpdatedBy(actorId);
        grant.setUpdatedAt(LocalDateTime.now());
        MemberRoleEntity saved = memberRoleRepository.save(grant);
        recordGrantChange(clanId, actorId, "member_grant_revoke", saved, role, before, reason);
    }

    @Transactional
    public MemberAggregateResponse updateMemberStatus(
            Long clanId,
            Long actorId,
            Long membershipId,
            UpdateMemberStatusRequest request
    ) {
        ClanMembershipEntity membership = clanMembershipRepository.findById(membershipId)
                .filter(item -> clanId.equals(item.getClanId()))
                .orElseThrow(() -> new BusinessException("MEMBER_NOT_FOUND", "宗族成员不存在"));
        MemberStatus targetStatus = parseWriteMemberStatus(request.status());
        memberGrantPolicyService.validateMemberStatusChange(
                clanId,
                actorId,
                membershipId,
                targetStatus,
                request.reason()
        );
        MemberStatus beforeStatus = membership.getMemberStatus();
        membership.setMemberStatus(targetStatus);
        membership.setUpdatedBy(actorId);
        membership.setUpdatedAt(LocalDateTime.now());
        ClanMembershipEntity saved = clanMembershipRepository.save(membership);
        operationLogApplicationService.record(
                clanId,
                actorId,
                "member_status_update",
                "clan_membership",
                membershipId,
                "member status changed for user " + saved.getUserId(),
                "before=" + beforeStatus + "; after=" + targetStatus + "; reason=" + request.reason().trim()
        );
        ActorScope actorScope = memberGrantPolicyService.actorScope(clanId, actorId);
        return aggregateMembers(clanId, actorId, actorScope, List.of(saved)).get(0);
    }

    private List<MemberAggregateResponse> aggregateMembers(
            Long clanId,
            Long actorId,
            ActorScope actorScope,
            List<ClanMembershipEntity> memberships
    ) {
        if (memberships.isEmpty()) {
            return List.of();
        }
        List<Long> membershipIds = memberships.stream().map(ClanMembershipEntity::getId).toList();
        Map<Long, AppUserEntity> users = appUserRepository.findAllById(
                        memberships.stream().map(ClanMembershipEntity::getUserId).distinct().toList()
                ).stream()
                .collect(Collectors.toMap(AppUserEntity::getId, Function.identity()));
        List<MemberRoleEntity> grants = memberRoleRepository.findByMembershipIdInAndStatus(membershipIds, STATUS_ACTIVE);
        Map<Long, List<MemberRoleEntity>> grantsByMembership = grants.stream()
                .collect(Collectors.groupingBy(MemberRoleEntity::getMembershipId));
        Map<Long, RoleEntity> roles = roleRepository.findAllById(
                        grants.stream().map(MemberRoleEntity::getRoleId).distinct().toList()
                ).stream()
                .collect(Collectors.toMap(RoleEntity::getId, Function.identity()));
        Map<Long, BranchEntity> branches = branchRepository.findAllById(
                        grants.stream()
                                .filter(grant -> isBranchScope(grant.getScopeType()))
                                .map(MemberRoleEntity::getScopeId)
                                .filter(Objects::nonNull)
                                .distinct()
                                .toList()
                ).stream()
                .collect(Collectors.toMap(BranchEntity::getId, Function.identity()));

        boolean canGrantPermission = authorizationApplicationService.can(clanId, actorId, "member.grant_role");
        boolean canEditPermission = canGrantPermission;
        boolean canRevokePermission = authorizationApplicationService.can(clanId, actorId, "member.revoke_role");
        boolean canDisablePermission = authorizationApplicationService.can(clanId, actorId, "member.disable");
        boolean canViewHistoryPermission = authorizationApplicationService.can(clanId, actorId, "operation_log.view");
        boolean canGrantRole = canGrantPermission
                && !memberGrantPolicyService.grantableRoleCodes(clanId, actorId).isEmpty();
        long activeAdminCount = canDisablePermission
                ? memberGrantPolicyService.activeClanAdminCount(clanId)
                : 0L;

        return memberships.stream().map(membership -> {
            AppUserEntity user = users.get(membership.getUserId());
            List<MemberRoleEntity> membershipGrants = grantsByMembership
                    .getOrDefault(membership.getId(), List.of());
            List<MemberRoleEntity> visibleMembershipGrants = membershipGrants.stream()
                    .filter(grant -> memberGrantPolicyService.canViewGrant(
                            actorScope,
                            grant.getScopeType(),
                            grant.getScopeId()
                    ))
                    .toList();
            List<MemberGrantResponse> memberGrants = visibleMembershipGrants.stream()
                    .sorted(Comparator.comparing(MemberRoleEntity::getId))
                    .map(grant -> {
                        RoleEntity role = roles.get(grant.getRoleId());
                        return toGrantResponse(
                                grant,
                                role,
                                scopeName(clanId, grant, branches),
                                actorScope,
                                canEditPermission,
                                canRevokePermission
                        );
                    })
                    .toList();
            boolean canEditAny = memberGrants.stream().anyMatch(MemberGrantResponse::canEditGrant);
            boolean canRevokeAny = memberGrants.stream().anyMatch(MemberGrantResponse::canRevokeGrant);
            boolean isLastActiveAdmin = membership.getMemberStatus() == MemberStatus.active
                    && activeAdminCount <= 1
                    && memberGrantPolicyService.containsClanAdminGrant(membershipGrants, roles);
            boolean canDisableMember = canDisablePermission
                    && memberGrantPolicyService.canManageMembership(actorScope, membershipGrants, roles)
                    && !isLastActiveAdmin;
            MemberAllowedActionsResponse actions = new MemberAllowedActionsResponse(
                    canGrantRole,
                    canEditAny,
                    canRevokeAny,
                    canDisableMember,
                    canViewHistoryPermission
                            && (actorScope.fullClanAccess() || !visibleMembershipGrants.isEmpty())
            );
            return new MemberAggregateResponse(
                    membership.getId(),
                    membership.getUserId(),
                    user == null ? null : user.getDisplayName(),
                    user == null ? null : maskAccount(user.getUsername()),
                    membership.getMemberStatus() == null ? null : membership.getMemberStatus().name(),
                    membership.getJoinedAt(),
                    membership.getUpdatedAt(),
                    memberGrants,
                    actions
            );
        }).toList();
    }

    private ClanMembershipEntity findOrCreateMembership(
            Long clanId,
            Long userId,
            Long actorId,
            String reason
    ) {
        return clanMembershipRepository.findByClanIdAndUserId(clanId, userId)
                .map(existing -> activateMembership(clanId, existing, actorId, reason))
                .orElseGet(() -> createMembership(clanId, userId, actorId));
    }

    private ClanMembershipEntity activateMembership(
            Long clanId,
            ClanMembershipEntity membership,
            Long actorId,
            String reason
    ) {
        if (membership.getMemberStatus() == MemberStatus.active) {
            return membership;
        }
        memberGrantPolicyService.validateMemberStatusChange(
                clanId,
                actorId,
                membership.getId(),
                MemberStatus.active,
                reason
        );
        membership.setMemberStatus(MemberStatus.active);
        membership.setUpdatedBy(actorId);
        membership.setUpdatedAt(LocalDateTime.now());
        return clanMembershipRepository.save(membership);
    }

    private ClanMembershipEntity createMembership(Long clanId, Long userId, Long actorId) {
        LocalDateTime now = LocalDateTime.now();
        ClanMembershipEntity membership = new ClanMembershipEntity();
        membership.setClanId(clanId);
        membership.setUserId(userId);
        membership.setJoinStatus(JOIN_STATUS_JOINED);
        membership.setMemberStatus(MemberStatus.active);
        membership.setInvitedBy(actorId);
        membership.setJoinedAt(now);
        membership.setCreatedBy(actorId);
        membership.setCreatedAt(now);
        membership.setUpdatedBy(actorId);
        membership.setUpdatedAt(now);
        return clanMembershipRepository.save(membership);
    }

    private MemberRoleEntity requireGrantInClan(Long clanId, Long grantId) {
        MemberRoleEntity grant = memberRoleRepository.findById(grantId)
                .orElseThrow(() -> new BusinessException("MEMBER_GRANT_NOT_FOUND", "成员授权不存在"));
        clanMembershipRepository.findById(grant.getMembershipId())
                .filter(membership -> clanId.equals(membership.getClanId()))
                .orElseThrow(() -> new BusinessException("MEMBER_GRANT_NOT_FOUND", "成员授权不属于当前宗族"));
        return grant;
    }

    private RoleEntity requireRole(String roleCode) {
        if (roleCode == null || roleCode.isBlank()) {
            throw new BusinessException("ROLE_REQUIRED", "请选择授权角色");
        }
        return roleRepository.findByRoleCode(roleCode.trim())
                .orElseThrow(() -> new BusinessException("ROLE_NOT_FOUND", "授权角色不存在"));
    }

    private RoleEntity requireRole(Long roleId) {
        return roleRepository.findById(roleId)
                .orElseThrow(() -> new BusinessException("ROLE_NOT_FOUND", "授权角色不存在"));
    }

    private MemberGrantResponse grantResponseForActor(
            Long clanId,
            Long actorId,
            MemberRoleEntity grant,
            RoleEntity role,
            String scopeName
    ) {
        ActorScope actorScope = memberGrantPolicyService.actorScope(clanId, actorId);
        return toGrantResponse(
                grant,
                role,
                scopeName,
                actorScope,
                authorizationApplicationService.can(clanId, actorId, "member.grant_role"),
                authorizationApplicationService.can(clanId, actorId, "member.revoke_role")
        );
    }

    private MemberGrantResponse toGrantResponse(
            MemberRoleEntity grant,
            RoleEntity role,
            String scopeName,
            ActorScope actorScope,
            boolean canEditPermission,
            boolean canRevokePermission
    ) {
        String roleCode = role == null ? null : role.getRoleCode();
        boolean manageable = roleCode != null && memberGrantPolicyService.canManageGrant(
                actorScope,
                roleCode,
                grant.getScopeType(),
                grant.getScopeId()
        );
        return new MemberGrantResponse(
                grant.getId(),
                roleCode,
                role == null ? null : role.getRoleName(),
                grant.getScopeType() == null ? null : grant.getScopeType().name(),
                grant.getScopeId(),
                scopeName,
                grant.getStatus(),
                grant.getGrantedBy(),
                grant.getGrantedAt(),
                grant.getUpdatedAt(),
                canEditPermission && manageable,
                canRevokePermission && manageable
        );
    }

    private GrantableRoleResponse toGrantableRoleResponse(RoleEntity role) {
        List<String> allowedScopeTypes;
        if (AuthorizationApplicationService.ROLE_CLAN_ADMIN.equals(role.getRoleCode())
                || AuthorizationApplicationService.ROLE_REVIEWER.equals(role.getRoleCode())) {
            allowedScopeTypes = List.of(MemberRoleScopeType.clan.name());
        } else if (AuthorizationApplicationService.ROLE_BRANCH_ADMIN.equals(role.getRoleCode())) {
            allowedScopeTypes = List.of(MemberRoleScopeType.branch_subtree.name());
        } else {
            allowedScopeTypes = List.of(MemberRoleScopeType.clan.name(), MemberRoleScopeType.branch_subtree.name());
        }
        return new GrantableRoleResponse(
                role.getRoleCode(),
                role.getRoleName(),
                role.getDescription(),
                allowedScopeTypes,
                HIGH_RISK_ROLES.contains(role.getRoleCode()) ? "high" : "normal"
        );
    }

    private String scopeName(Long clanId, MemberRoleEntity grant) {
        if (!isBranchScope(grant.getScopeType())) {
            return "全宗族";
        }
        BranchEntity branch = branchRepository.findByIdAndClanId(grant.getScopeId(), clanId).orElse(null);
        return scopeName(grant, branch);
    }

    private String scopeName(Long clanId, MemberRoleEntity grant, Map<Long, BranchEntity> branches) {
        if (!isBranchScope(grant.getScopeType())) {
            return "全宗族";
        }
        BranchEntity branch = branches.get(grant.getScopeId());
        if (branch != null && clanId.equals(branch.getClanId())) {
            return scopeName(grant, branch);
        }
        return "未知支派";
    }

    private String scopeName(MemberRoleEntity grant, BranchEntity branch) {
        String name = branch == null ? "未知支派" : branch.getBranchName();
        return grant.getScopeType() == MemberRoleScopeType.branch_subtree ? name + "及下级支派" : name;
    }

    private void recordGrantChange(
            Long clanId,
            Long actorId,
            String action,
            MemberRoleEntity grant,
            RoleEntity role,
            String before,
            String reason
    ) {
        operationLogApplicationService.record(
                clanId,
                actorId,
                action,
                "member_role",
                grant.getId(),
                "member grant changed for membership " + grant.getMembershipId(),
                "before=" + value(before)
                        + "; after=" + grantSnapshot(grant, role)
                        + "; reason=" + reason.trim()
        );
    }

    private String grantSnapshot(MemberRoleEntity grant, RoleEntity role) {
        return "role=" + (role == null ? null : role.getRoleCode())
                + ",scopeType=" + grant.getScopeType()
                + ",scopeId=" + grant.getScopeId()
                + ",status=" + grant.getStatus();
    }

    private MemberRoleScopeType parseWriteScopeType(String scopeType) {
        if (scopeType == null || scopeType.isBlank()) {
            throw new BusinessException("MEMBER_SCOPE_REQUIRED", "请选择授权范围");
        }
        String normalized = scopeType.trim().toLowerCase(Locale.ROOT);
        if (MemberRoleScopeType.branch.name().equals(normalized)) {
            return MemberRoleScopeType.branch_subtree;
        }
        try {
            MemberRoleScopeType parsed = MemberRoleScopeType.valueOf(normalized);
            if (parsed != MemberRoleScopeType.clan && parsed != MemberRoleScopeType.branch_subtree) {
                throw new BusinessException("MEMBER_SCOPE_INVALID", "仅支持全宗族或支派及下级支派范围");
            }
            return parsed;
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("MEMBER_SCOPE_INVALID", "授权范围类型不正确");
        }
    }

    private MemberRoleScopeType parseOptionalScopeType(String scopeType) {
        String normalized = normalizeFilter(scopeType);
        if (normalized == null) {
            return null;
        }
        if (MemberRoleScopeType.branch.name().equals(normalized)) {
            return MemberRoleScopeType.branch_subtree;
        }
        try {
            return MemberRoleScopeType.valueOf(normalized);
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("MEMBER_SCOPE_INVALID", "授权范围类型不正确");
        }
    }

    private MemberStatus parseOptionalMemberStatus(String status) {
        String normalized = normalizeFilter(status);
        if (normalized == null) {
            return null;
        }
        return parseMemberStatus(normalized);
    }

    private MemberStatus parseWriteMemberStatus(String status) {
        MemberStatus parsed = parseMemberStatus(status);
        if (parsed != MemberStatus.active && parsed != MemberStatus.disabled && parsed != MemberStatus.removed) {
            throw new BusinessException("MEMBER_STATUS_INVALID", "仅支持启用、停用或移除成员");
        }
        return parsed;
    }

    private MemberStatus parseMemberStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new BusinessException("MEMBER_STATUS_REQUIRED", "请选择成员状态");
        }
        String normalized = status.trim().toLowerCase(Locale.ROOT);
        if (MemberStatus.inactive.name().equals(normalized)) {
            normalized = MemberStatus.disabled.name();
        }
        try {
            return MemberStatus.valueOf(normalized);
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("MEMBER_STATUS_INVALID", "成员状态不正确");
        }
    }

    private boolean isBranchScope(MemberRoleScopeType scopeType) {
        return scopeType == MemberRoleScopeType.branch || scopeType == MemberRoleScopeType.branch_subtree;
    }

    private String normalizeFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String maskAccount(String username) {
        if (username == null || username.isBlank()) {
            return "***";
        }
        String normalized = username.trim();
        if (normalized.length() <= 2) {
            return normalized.charAt(0) + "***";
        }
        return normalized.substring(0, 2) + "***";
    }

    private String value(String value) {
        return value == null ? "" : value;
    }
}
