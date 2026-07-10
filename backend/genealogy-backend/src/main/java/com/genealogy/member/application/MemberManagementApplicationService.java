package com.genealogy.member.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.dto.ClanMemberResponse;
import com.genealogy.member.dto.CreateClanMemberRequest;
import com.genealogy.member.dto.MemberPermissionSummaryResponse;
import com.genealogy.member.dto.RoleResponse;
import com.genealogy.member.dto.UpdateClanMemberRoleRequest;
import com.genealogy.member.dto.UserSummaryResponse;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import com.genealogy.member.repository.RoleRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class MemberManagementApplicationService {

    private static final String ROLE_VIEWER = AuthorizationApplicationService.ROLE_VIEWER;
    private static final String STATUS_ACTIVE = "active";
    private static final String STATUS_REVOKED = "revoked";
    private static final String JOIN_STATUS_JOINED = "joined";
    private static final Set<String> HIGH_RISK_ROLE_CODES = Set.of(
            AuthorizationApplicationService.ROLE_CLAN_ADMIN,
            AuthorizationApplicationService.ROLE_REVIEWER
    );

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final ClanMembershipRepository clanMembershipRepository;
    private final MemberRoleRepository memberRoleRepository;
    private final BranchRepository branchRepository;
    private final OperationLogApplicationService operationLogApplicationService;

    public MemberManagementApplicationService(
            AppUserRepository appUserRepository,
            RoleRepository roleRepository,
            ClanMembershipRepository clanMembershipRepository,
            MemberRoleRepository memberRoleRepository,
            BranchRepository branchRepository,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.appUserRepository = appUserRepository;
        this.roleRepository = roleRepository;
        this.clanMembershipRepository = clanMembershipRepository;
        this.memberRoleRepository = memberRoleRepository;
        this.branchRepository = branchRepository;
        this.operationLogApplicationService = operationLogApplicationService;
    }

    @Transactional(readOnly = true)
    public List<UserSummaryResponse> users() {
        return appUserRepository.findAll()
                .stream()
                .filter(user -> user.getDeletedAt() == null)
                .sorted(Comparator.comparing(AppUserEntity::getId))
                .map(this::toUserResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> roles() {
        return roleRepository.findAll()
                .stream()
                .filter(role -> !AuthorizationApplicationService.ROLE_CROSS_CLAN_ADMIN.equals(role.getRoleCode()))
                .sorted(Comparator.comparing(RoleEntity::getId))
                .map(this::toRoleResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public MemberPermissionSummaryResponse summary(Long clanId) {
        List<ClanMembershipEntity> memberships = clanMembershipRepository.findByClanIdAndMemberStatus(clanId, MemberStatus.active);
        List<Long> membershipIds = memberships.stream().map(ClanMembershipEntity::getId).toList();
        List<MemberRoleEntity> roleRows = membershipIds.isEmpty()
                ? List.of()
                : memberRoleRepository.findByMembershipIdInAndStatus(membershipIds, STATUS_ACTIVE);
        Map<Long, RoleEntity> roleMap = roleRepository.findAllById(
                        roleRows.stream()
                                .map(MemberRoleEntity::getRoleId)
                                .filter(Objects::nonNull)
                                .toList()
                ).stream()
                .collect(Collectors.toMap(RoleEntity::getId, Function.identity(), (first, second) -> first));
        Set<Long> branchManagerScopeIds = roleRows.stream()
                .filter(roleRow -> AuthorizationApplicationService.ROLE_BRANCH_ADMIN.equals(roleCode(roleMap.get(roleRow.getRoleId()))))
                .map(MemberRoleEntity::getScopeId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        long branchCount = branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(clanId).size();
        long adminCount = roleRows.stream()
                .filter(roleRow -> AuthorizationApplicationService.ROLE_CLAN_ADMIN.equals(roleCode(roleMap.get(roleRow.getRoleId()))))
                .count();
        long branchManagerCount = roleRows.stream()
                .filter(roleRow -> AuthorizationApplicationService.ROLE_BRANCH_ADMIN.equals(roleCode(roleMap.get(roleRow.getRoleId()))))
                .count();
        long highRiskGrantCount = roleRows.stream()
                .filter(roleRow -> HIGH_RISK_ROLE_CODES.contains(roleCode(roleMap.get(roleRow.getRoleId()))))
                .count();
        LocalDateTime latestPermissionChangedAt = roleRows.stream()
                .map(roleRow -> roleRow.getUpdatedAt() == null ? roleRow.getCreatedAt() : roleRow.getUpdatedAt())
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);
        return new MemberPermissionSummaryResponse(
                memberships.size(),
                adminCount,
                branchManagerCount,
                Math.max(0, branchCount - branchManagerScopeIds.size()),
                highRiskGrantCount,
                latestPermissionChangedAt
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<ClanMemberResponse> members(
            Long clanId,
            String keyword,
            String roleCode,
            String scopeType,
            String status,
            int pageNo,
            int pageSize
    ) {
        List<ClanMemberResponse> filtered = memberRows(clanId).stream()
                .filter(member -> matchesKeyword(member, keyword))
                .filter(member -> isBlank(roleCode) || Objects.equals(member.roleCode(), roleCode))
                .filter(member -> isBlank(scopeType) || Objects.equals(member.scopeType(), scopeType))
                .filter(member -> isBlank(status) || Objects.equals(member.memberStatus(), status))
                .toList();
        int normalizedPageNo = Math.max(1, pageNo);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, 200));
        int fromIndex = Math.min((normalizedPageNo - 1) * normalizedPageSize, filtered.size());
        int toIndex = Math.min(fromIndex + normalizedPageSize, filtered.size());
        return PageResponse.of(filtered.subList(fromIndex, toIndex), filtered.size(), normalizedPageNo, normalizedPageSize);
    }

    @Transactional(readOnly = true)
    public List<ClanMemberResponse> members(Long clanId) {
        return memberRows(clanId);
    }

    private List<ClanMemberResponse> memberRows(Long clanId) {
        List<ClanMembershipEntity> memberships = clanMembershipRepository.findByClanIdAndMemberStatus(clanId, MemberStatus.active);
        Map<Long, ClanMembershipEntity> membershipsById = memberships.stream()
                .collect(Collectors.toMap(ClanMembershipEntity::getId, Function.identity(), (first, second) -> first));
        List<Long> membershipIds = memberships.stream().map(ClanMembershipEntity::getId).toList();
        List<MemberRoleEntity> roleRows = membershipIds.isEmpty()
                ? List.of()
                : memberRoleRepository.findByMembershipIdInAndStatus(membershipIds, STATUS_ACTIVE);
        Map<Long, AppUserEntity> users = appUserRepository.findAllById(
                        memberships.stream()
                                .map(ClanMembershipEntity::getUserId)
                                .filter(Objects::nonNull)
                                .toList()
                ).stream()
                .collect(Collectors.toMap(AppUserEntity::getId, Function.identity(), (first, second) -> first));
        Map<Long, RoleEntity> roles = roleRepository.findAllById(
                        roleRows.stream()
                                .map(MemberRoleEntity::getRoleId)
                                .filter(Objects::nonNull)
                                .toList()
                ).stream()
                .collect(Collectors.toMap(RoleEntity::getId, Function.identity(), (first, second) -> first));
        return roleRows.stream()
                .sorted(Comparator.comparing(MemberRoleEntity::getId))
                .map(memberRole -> {
                    ClanMembershipEntity membership = membershipsById.get(memberRole.getMembershipId());
                    AppUserEntity user = membership == null ? null : users.get(membership.getUserId());
                    return toMemberResponse(memberRole, membership, user, roles.get(memberRole.getRoleId()));
                })
                .toList();
    }

    @Transactional
    public ClanMemberResponse createMember(Long clanId, CreateClanMemberRequest request) {
        return createMember(clanId, request, null);
    }

    @Transactional
    public ClanMemberResponse createMember(Long clanId, CreateClanMemberRequest request, Long actorId) {
        AppUserEntity user = appUserRepository.findById(request.userId())
                .filter(item -> item.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException("USER_NOT_FOUND", "user not found"));
        RoleEntity role = findRole(request.roleCode());
        MemberRoleScopeType scopeType = parseScopeType(request.scopeType());
        Long normalizedScopeId = normalizeScopeId(clanId, scopeType, request.scopeId(), request.branchId());

        ClanMembershipEntity membership = findOrCreateMembership(clanId, user, actorId);
        if (memberRoleRepository.existsByMembershipIdAndRoleIdAndScopeTypeAndScopeIdAndStatus(
                membership.getId(), role.getId(), scopeType, normalizedScopeId, STATUS_ACTIVE
        )) {
            throw new BusinessException("MEMBER_GRANT_DUPLICATED", "user already has the same role and scope grant");
        }

        LocalDateTime now = LocalDateTime.now();
        MemberRoleEntity memberRole = new MemberRoleEntity();
        memberRole.setMembershipId(membership.getId());
        memberRole.setRoleId(role.getId());
        memberRole.setScopeType(scopeType);
        memberRole.setScopeId(normalizedScopeId);
        memberRole.setStatus(STATUS_ACTIVE);
        memberRole.setGrantedBy(actorId);
        memberRole.setGrantedAt(now);
        memberRole.setCreatedBy(actorId);
        memberRole.setCreatedAt(now);
        memberRole.setUpdatedBy(actorId);
        memberRole.setUpdatedAt(now);
        MemberRoleEntity saved = memberRoleRepository.save(memberRole);
        recordMemberPermissionChange(clanId, actorId, "member_invite", saved, membership, role, null, permissionSnapshot(saved, membership, role));
        return toMemberResponse(saved, membership, user, role);
    }

    @Transactional
    public ClanMemberResponse updateMember(Long clanId, Long memberRoleId, UpdateClanMemberRoleRequest request) {
        return updateMember(clanId, memberRoleId, request, null);
    }

    @Transactional
    public ClanMemberResponse updateMember(Long clanId, Long memberRoleId, UpdateClanMemberRoleRequest request, Long actorId) {
        MemberRoleEntity memberRole = memberRoleRepository.findById(memberRoleId)
                .orElseThrow(() -> new BusinessException("MEMBER_ROLE_NOT_FOUND", "member role not found"));
        ClanMembershipEntity membership = clanMembershipRepository.findById(memberRole.getMembershipId())
                .filter(item -> item.getClanId().equals(clanId))
                .orElseThrow(() -> new BusinessException("MEMBER_NOT_FOUND", "member not found"));
        RoleEntity oldRole = memberRole.getRoleId() == null ? null : roleRepository.findById(memberRole.getRoleId()).orElse(null);
        String before = permissionSnapshot(memberRole, membership, oldRole);

        RoleEntity role = findRole(request.roleCode());
        MemberRoleScopeType scopeType = parseScopeType(request.scopeType() == null ? "clan" : request.scopeType());
        Long normalizedScopeId = normalizeScopeId(clanId, scopeType, request.scopeId(), request.branchId());
        memberRoleRepository.findByMembershipIdAndRoleIdAndScopeTypeAndScopeId(membership.getId(), role.getId(), scopeType, normalizedScopeId)
                .filter(existing -> !existing.getId().equals(memberRole.getId()))
                .filter(existing -> STATUS_ACTIVE.equals(existing.getStatus()))
                .ifPresent(existing -> {
                    throw new BusinessException("MEMBER_GRANT_DUPLICATED", "user already has the same role and scope grant");
                });

        memberRole.setRoleId(role.getId());
        memberRole.setScopeType(scopeType);
        memberRole.setScopeId(normalizedScopeId);
        memberRole.setStatus(STATUS_ACTIVE);
        memberRole.setUpdatedBy(actorId);
        memberRole.setUpdatedAt(LocalDateTime.now());
        if (request.memberStatus() != null && !request.memberStatus().isBlank()) {
            membership.setMemberStatus(MemberStatus.valueOf(request.memberStatus()));
            membership.setUpdatedBy(actorId);
            membership.setUpdatedAt(LocalDateTime.now());
            membership = clanMembershipRepository.save(membership);
        }
        MemberRoleEntity saved = memberRoleRepository.save(memberRole);
        AppUserEntity user = membership.getUserId() == null ? null : appUserRepository.findById(membership.getUserId()).orElse(null);
        recordMemberPermissionChange(clanId, actorId, "member_update_role", saved, membership, role, before, permissionSnapshot(saved, membership, role));
        return toMemberResponse(saved, membership, user, role);
    }

    @Transactional
    public void revokeMemberRole(Long clanId, Long memberRoleId, Long actorId) {
        MemberRoleEntity memberRole = memberRoleRepository.findById(memberRoleId)
                .orElseThrow(() -> new BusinessException("MEMBER_ROLE_NOT_FOUND", "member role not found"));
        ClanMembershipEntity membership = clanMembershipRepository.findById(memberRole.getMembershipId())
                .filter(item -> item.getClanId().equals(clanId))
                .orElseThrow(() -> new BusinessException("MEMBER_NOT_FOUND", "member not found"));
        RoleEntity role = memberRole.getRoleId() == null ? null : roleRepository.findById(memberRole.getRoleId()).orElse(null);
        String before = permissionSnapshot(memberRole, membership, role);
        memberRole.setStatus(STATUS_REVOKED);
        memberRole.setRevokedAt(LocalDateTime.now());
        memberRole.setUpdatedBy(actorId);
        memberRole.setUpdatedAt(LocalDateTime.now());
        MemberRoleEntity saved = memberRoleRepository.save(memberRole);
        recordMemberPermissionChange(clanId, actorId, "member_revoke_role", saved, membership, role, before, permissionSnapshot(saved, membership, role));
    }

    private ClanMembershipEntity findOrCreateMembership(Long clanId, AppUserEntity user, Long actorId) {
        return clanMembershipRepository.findByClanIdAndUserId(clanId, user.getId())
                .map(existing -> activateMembership(existing, actorId))
                .orElseGet(() -> createMembership(clanId, user.getId(), actorId));
    }

    private ClanMembershipEntity activateMembership(ClanMembershipEntity membership, Long actorId) {
        if (membership.getMemberStatus() == MemberStatus.active) {
            return membership;
        }
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

    private Long normalizeScopeId(Long clanId, MemberRoleScopeType scopeType, Long scopeId, Long branchId) {
        if (scopeType == MemberRoleScopeType.global) {
            return 0L;
        }
        if (scopeType == MemberRoleScopeType.clan) {
            return clanId;
        }
        if (scopeType == MemberRoleScopeType.self) {
            if (scopeId == null) {
                throw new BusinessException("MEMBER_SELF_SCOPE_REQUIRED", "self scope requires person");
            }
            return scopeId;
        }
        Long effectiveBranchId = scopeId == null ? branchId : scopeId;
        if (effectiveBranchId == null) {
            throw new BusinessException("MEMBER_BRANCH_SCOPE_REQUIRED", "branch scope requires branch");
        }
        requireBranchInClan(clanId, effectiveBranchId);
        return effectiveBranchId;
    }

    private Long branchId(MemberRoleEntity memberRole) {
        return memberRole.getScopeType() == MemberRoleScopeType.branch ? memberRole.getScopeId() : null;
    }

    private void requireBranchInClan(Long clanId, Long branchId) {
        if (branchId == null || branchRepository.findByIdAndClanId(branchId, clanId).isEmpty()) {
            throw new BusinessException("BRANCH_CLAN_MISMATCH", "branch is not in clan");
        }
    }

    private RoleEntity findRole(String roleCode) {
        String normalizedRoleCode = roleCode.trim();
        if (AuthorizationApplicationService.ROLE_CROSS_CLAN_ADMIN.equals(normalizedRoleCode)) {
            throw new BusinessException("CROSS_CLAN_ADMIN_ASSIGN_FORBIDDEN", "cross clan admin cannot be assigned here");
        }
        return roleRepository.findByRoleCode(normalizedRoleCode)
                .orElseThrow(() -> new BusinessException("ROLE_NOT_FOUND", "role not found"));
    }

    private MemberRoleScopeType parseScopeType(String scopeType) {
        String normalized = scopeType == null ? "clan" : scopeType.trim().toLowerCase(Locale.ROOT);
        if ("branch_subtree".equals(normalized)) {
            return MemberRoleScopeType.branch;
        }
        return MemberRoleScopeType.valueOf(normalized);
    }

    private void recordMemberPermissionChange(Long clanId, Long actorId, String actionType, MemberRoleEntity memberRole, ClanMembershipEntity membership, RoleEntity role, String before, String after) {
        operationLogApplicationService.record(
                clanId,
                actorId,
                actionType,
                "member_role",
                memberRole.getId(),
                "member permission changed for user " + membership.getUserId(),
                "before=" + value(before) + "; after=" + value(after)
        );
    }

    private String permissionSnapshot(MemberRoleEntity memberRole, ClanMembershipEntity membership, RoleEntity role) {
        return "role=" + (role == null ? null : role.getRoleCode())
                + ",memberStatus=" + membership.getMemberStatus()
                + ",scopeType=" + memberRole.getScopeType()
                + ",scopeId=" + memberRole.getScopeId()
                + ",branchId=" + branchId(memberRole);
    }

    private String value(String value) {
        return value == null ? "" : value;
    }

    private UserSummaryResponse toUserResponse(AppUserEntity user) {
        return new UserSummaryResponse(
                user.getId(),
                user.getUsername(),
                user.getPhone(),
                user.getEmail(),
                user.getDisplayName(),
                user.getAvatarUrl(),
                user.getStatus(),
                user.getLastLoginAt(),
                user.getCreatedAt()
        );
    }

    private RoleResponse toRoleResponse(RoleEntity role) {
        return new RoleResponse(
                role.getId(),
                role.getRoleCode(),
                role.getRoleName(),
                roleType(role.getRoleCode()),
                role.getDescription(),
                role.getSystemRole(),
                role.getCreatedAt()
        );
    }

    private ClanMemberResponse toMemberResponse(MemberRoleEntity memberRole, ClanMembershipEntity membership, AppUserEntity user, RoleEntity role) {
        return new ClanMemberResponse(
                memberRole.getId(),
                membership.getClanId(),
                membership.getUserId(),
                user == null ? null : user.getUsername(),
                user == null ? null : user.getDisplayName(),
                branchId(memberRole),
                memberRole.getRoleId(),
                role == null ? null : role.getRoleCode(),
                role == null ? null : role.getRoleName(),
                role == null ? null : roleType(role.getRoleCode()),
                user == null ? null : user.getDisplayName(),
                membership.getMemberStatus() == null ? null : membership.getMemberStatus().name(),
                memberRole.getScopeType() == null ? null : memberRole.getScopeType().name(),
                memberRole.getScopeId(),
                membership.getJoinedAt(),
                memberRole.getCreatedAt(),
                memberRole.getUpdatedAt()
        );
    }

    private String roleType(String roleCode) {
        return ROLE_VIEWER.equals(roleCode) ? "view" : "manage";
    }

    private String roleCode(RoleEntity role) {
        return role == null ? null : role.getRoleCode();
    }

    private boolean matchesKeyword(ClanMemberResponse member, String keyword) {
        if (isBlank(keyword)) return true;
        String normalized = keyword.trim().toLowerCase(Locale.ROOT);
        return contains(member.displayName(), normalized)
                || contains(member.memberName(), normalized)
                || contains(member.username(), normalized)
                || contains(member.roleName(), normalized)
                || contains(member.roleCode(), normalized);
    }

    private boolean contains(String value, String keyword) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(keyword);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
