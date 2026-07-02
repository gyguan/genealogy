package com.genealogy.member.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.dto.ClanMemberResponse;
import com.genealogy.member.dto.CreateClanMemberRequest;
import com.genealogy.member.dto.RoleResponse;
import com.genealogy.member.dto.UpdateClanMemberRoleRequest;
import com.genealogy.member.dto.UserSummaryResponse;
import com.genealogy.member.entity.ClanMemberEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMemberRepository;
import com.genealogy.member.repository.RoleRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class MemberManagementApplicationService {

    private static final String ROLE_VIEWER = AuthorizationApplicationService.ROLE_VIEWER;

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final ClanMemberRepository clanMemberRepository;
    private final BranchRepository branchRepository;
    private final OperationLogApplicationService operationLogApplicationService;

    public MemberManagementApplicationService(
            AppUserRepository appUserRepository,
            RoleRepository roleRepository,
            ClanMemberRepository clanMemberRepository,
            BranchRepository branchRepository,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.appUserRepository = appUserRepository;
        this.roleRepository = roleRepository;
        this.clanMemberRepository = clanMemberRepository;
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
    public List<ClanMemberResponse> members(Long clanId) {
        List<ClanMemberEntity> memberRows = clanMemberRepository.findByClanIdAndMemberStatus(clanId, MemberStatus.active);
        Map<Long, AppUserEntity> users = appUserRepository.findAllById(
                        memberRows.stream()
                                .map(ClanMemberEntity::getUserId)
                                .filter(Objects::nonNull)
                                .toList()
                ).stream()
                .collect(Collectors.toMap(AppUserEntity::getId, Function.identity()));
        Map<Long, RoleEntity> roles = roleRepository.findAll().stream()
                .collect(Collectors.toMap(RoleEntity::getId, Function.identity(), (first, second) -> first));
        return memberRows
                .stream()
                .sorted(Comparator.comparing(ClanMemberEntity::getId))
                .map(member -> toMemberResponse(member, users.get(member.getUserId()), roles.get(member.getRoleId())))
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
        clanMemberRepository.findByClanIdAndUserId(clanId, request.userId())
                .ifPresent(existing -> {
                    throw new BusinessException("MEMBER_DUPLICATED", "user is already a clan member");
                });

        MemberScopeType scopeType = parseScopeType(request.scopeType());
        Long normalizedScopeId = normalizeScopeId(clanId, scopeType, request.scopeId(), request.branchId());
        Long normalizedBranchId = normalizeBranchId(clanId, scopeType, request.branchId(), normalizedScopeId);

        LocalDateTime now = LocalDateTime.now();
        ClanMemberEntity member = new ClanMemberEntity();
        member.setClanId(clanId);
        member.setUserId(user.getId());
        member.setBranchId(normalizedBranchId);
        member.setRoleId(role.getId());
        member.setMemberName(request.memberName().trim());
        member.setMemberStatus(MemberStatus.active);
        member.setScopeType(scopeType);
        member.setScopeId(normalizedScopeId);
        member.setJoinedAt(now);
        member.setCreatedAt(now);
        member.setUpdatedAt(now);
        ClanMemberEntity saved = clanMemberRepository.save(member);
        recordMemberPermissionChange(clanId, actorId, "member_invite", saved, role, null, permissionSnapshot(saved, role));
        return toMemberResponse(saved, user, role);
    }

    @Transactional
    public ClanMemberResponse updateMember(Long clanId, Long memberId, UpdateClanMemberRoleRequest request) {
        return updateMember(clanId, memberId, request, null);
    }

    @Transactional
    public ClanMemberResponse updateMember(Long clanId, Long memberId, UpdateClanMemberRoleRequest request, Long actorId) {
        ClanMemberEntity member = clanMemberRepository.findById(memberId)
                .filter(item -> item.getClanId().equals(clanId))
                .orElseThrow(() -> new BusinessException("MEMBER_NOT_FOUND", "member not found"));
        RoleEntity oldRole = member.getRoleId() == null ? null : roleRepository.findById(member.getRoleId()).orElse(null);
        String before = permissionSnapshot(member, oldRole);
        RoleEntity role = findRole(request.roleCode());
        MemberScopeType scopeType = parseScopeType(request.scopeType() == null ? "clan" : request.scopeType());
        Long normalizedScopeId = normalizeScopeId(clanId, scopeType, request.scopeId(), request.branchId());
        Long normalizedBranchId = normalizeBranchId(clanId, scopeType, request.branchId(), normalizedScopeId);

        member.setRoleId(role.getId());
        member.setBranchId(normalizedBranchId);
        member.setScopeType(scopeType);
        member.setScopeId(normalizedScopeId);
        if (request.memberStatus() != null && !request.memberStatus().isBlank()) {
            member.setMemberStatus(MemberStatus.valueOf(request.memberStatus()));
        }
        member.setUpdatedAt(LocalDateTime.now());
        ClanMemberEntity saved = clanMemberRepository.save(member);
        AppUserEntity user = saved.getUserId() == null ? null : appUserRepository.findById(saved.getUserId()).orElse(null);
        recordMemberPermissionChange(clanId, actorId, "member_update_role", saved, role, before, permissionSnapshot(saved, role));
        return toMemberResponse(saved, user, role);
    }

    private Long normalizeScopeId(Long clanId, MemberScopeType scopeType, Long scopeId, Long branchId) {
        if (scopeType == MemberScopeType.clan) {
            return clanId;
        }
        Long effectiveBranchId = scopeId == null ? branchId : scopeId;
        if (effectiveBranchId == null) {
            throw new BusinessException("MEMBER_BRANCH_SCOPE_REQUIRED", "branch scope requires branch");
        }
        requireBranchInClan(clanId, effectiveBranchId);
        return effectiveBranchId;
    }

    private Long normalizeBranchId(Long clanId, MemberScopeType scopeType, Long branchId, Long scopeId) {
        if (scopeType == MemberScopeType.branch || scopeType == MemberScopeType.branch_subtree) {
            Long effectiveBranchId = branchId == null ? scopeId : branchId;
            requireBranchInClan(clanId, effectiveBranchId);
            return effectiveBranchId;
        }
        if (branchId != null) {
            requireBranchInClan(clanId, branchId);
        }
        return branchId;
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

    private MemberScopeType parseScopeType(String scopeType) {
        String normalized = scopeType == null ? "clan" : scopeType.trim().toLowerCase(Locale.ROOT);
        return MemberScopeType.valueOf(normalized);
    }

    private void recordMemberPermissionChange(Long clanId, Long actorId, String actionType, ClanMemberEntity member, RoleEntity role, String before, String after) {
        operationLogApplicationService.record(
                clanId,
                actorId,
                actionType,
                "member",
                member.getId(),
                "member permission changed for user " + member.getUserId(),
                "before=" + value(before) + "; after=" + value(after)
        );
    }

    private String permissionSnapshot(ClanMemberEntity member, RoleEntity role) {
        return "role=" + (role == null ? null : role.getRoleCode())
                + ",status=" + member.getMemberStatus()
                + ",scopeType=" + member.getScopeType()
                + ",scopeId=" + member.getScopeId()
                + ",branchId=" + member.getBranchId();
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

    private ClanMemberResponse toMemberResponse(ClanMemberEntity member, AppUserEntity user, RoleEntity role) {
        return new ClanMemberResponse(
                member.getId(),
                member.getClanId(),
                member.getUserId(),
                user == null ? null : user.getUsername(),
                user == null ? null : user.getDisplayName(),
                member.getBranchId(),
                member.getRoleId(),
                role == null ? null : role.getRoleCode(),
                role == null ? null : role.getRoleName(),
                role == null ? null : roleType(role.getRoleCode()),
                member.getMemberName(),
                member.getMemberStatus() == null ? null : member.getMemberStatus().name(),
                member.getScopeType() == null ? null : member.getScopeType().name(),
                member.getScopeId(),
                member.getJoinedAt(),
                member.getCreatedAt(),
                member.getUpdatedAt()
        );
    }

    private String roleType(String roleCode) {
        return ROLE_VIEWER.equals(roleCode) ? "view" : "manage";
    }
}
