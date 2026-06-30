package com.genealogy.member.application;

import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class MemberManagementApplicationService {

    private static final String ROLE_VIEWER = "viewer";

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final ClanMemberRepository clanMemberRepository;

    public MemberManagementApplicationService(
            AppUserRepository appUserRepository,
            RoleRepository roleRepository,
            ClanMemberRepository clanMemberRepository
    ) {
        this.appUserRepository = appUserRepository;
        this.roleRepository = roleRepository;
        this.clanMemberRepository = clanMemberRepository;
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
                .sorted(Comparator.comparing(RoleEntity::getId))
                .map(this::toRoleResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ClanMemberResponse> members(Long clanId) {
        Map<Long, AppUserEntity> users = appUserRepository.findAllById(
                        clanMemberRepository.findByClanIdAndMemberStatus(clanId, MemberStatus.active)
                                .stream()
                                .map(ClanMemberEntity::getUserId)
                                .toList()
                ).stream()
                .collect(Collectors.toMap(AppUserEntity::getId, Function.identity()));
        Map<Long, RoleEntity> roles = roleRepository.findAll().stream()
                .collect(Collectors.toMap(RoleEntity::getId, Function.identity()));
        return clanMemberRepository.findByClanIdAndMemberStatus(clanId, MemberStatus.active)
                .stream()
                .sorted(Comparator.comparing(ClanMemberEntity::getId))
                .map(member -> toMemberResponse(member, users.get(member.getUserId()), roles.get(member.getRoleId())))
                .toList();
    }

    @Transactional
    public ClanMemberResponse createMember(Long clanId, CreateClanMemberRequest request) {
        AppUserEntity user = appUserRepository.findById(request.userId())
                .filter(item -> item.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException("USER_NOT_FOUND", "用户不存在"));
        RoleEntity role = findRole(request.roleCode());
        clanMemberRepository.findByClanIdAndUserId(clanId, request.userId())
                .ifPresent(existing -> {
                    throw new BusinessException("MEMBER_DUPLICATED", "该用户已经是当前宗族成员");
                });

        LocalDateTime now = LocalDateTime.now();
        ClanMemberEntity member = new ClanMemberEntity();
        member.setClanId(clanId);
        member.setUserId(user.getId());
        member.setBranchId(request.branchId());
        member.setRoleId(role.getId());
        member.setMemberName(request.memberName().trim());
        member.setMemberStatus(MemberStatus.active);
        member.setScopeType(parseScopeType(request.scopeType()));
        member.setScopeId(request.scopeId() == null ? clanId : request.scopeId());
        member.setJoinedAt(now);
        member.setCreatedAt(now);
        member.setUpdatedAt(now);
        return toMemberResponse(clanMemberRepository.save(member), user, role);
    }

    @Transactional
    public ClanMemberResponse updateMember(Long clanId, Long memberId, UpdateClanMemberRoleRequest request) {
        ClanMemberEntity member = clanMemberRepository.findById(memberId)
                .filter(item -> item.getClanId().equals(clanId))
                .orElseThrow(() -> new BusinessException("MEMBER_NOT_FOUND", "成员不存在"));
        RoleEntity role = findRole(request.roleCode());
        member.setRoleId(role.getId());
        member.setBranchId(request.branchId());
        member.setScopeType(parseScopeType(request.scopeType() == null ? "clan" : request.scopeType()));
        member.setScopeId(request.scopeId() == null ? clanId : request.scopeId());
        if (request.memberStatus() != null && !request.memberStatus().isBlank()) {
            member.setMemberStatus(MemberStatus.valueOf(request.memberStatus()));
        }
        member.setUpdatedAt(LocalDateTime.now());
        AppUserEntity user = appUserRepository.findById(member.getUserId()).orElse(null);
        return toMemberResponse(clanMemberRepository.save(member), user, role);
    }

    private RoleEntity findRole(String roleCode) {
        return roleRepository.findByRoleCode(roleCode.trim())
                .orElseThrow(() -> new BusinessException("ROLE_NOT_FOUND", "角色不存在"));
    }

    private MemberScopeType parseScopeType(String scopeType) {
        String normalized = scopeType == null ? "clan" : scopeType.trim().toLowerCase(Locale.ROOT);
        return MemberScopeType.valueOf(normalized);
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
