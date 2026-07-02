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
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthorizationApplicationService {

    public static final String ROLE_CROSS_CLAN_ADMIN = "cross_clan_admin";
    private static final String ROLE_CLAN_ADMIN = "clan_admin";
    private static final String ROLE_BRANCH_ADMIN = "branch_admin";
    private static final String ROLE_EDITOR = "editor";

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
        Long primaryClanId = primaryClanId(userId).orElse(null);
        if (primaryClanId == null || !primaryClanId.equals(clanId)) {
            throw new BusinessException("AUTH_FORBIDDEN", "当前用户无权访问该宗族");
        }
        return findActiveMemberInClan(clanId, userId)
                .orElseThrow(() -> new BusinessException("AUTH_FORBIDDEN", "当前用户不是该宗族成员"));
    }

    @Transactional(readOnly = true)
    public ClanMemberEntity requireAnyRole(Long clanId, Long userId, String... roleCodes) {
        ClanMemberEntity member = requireClanMember(clanId, userId);
        String actualRoleCode = roleCode(member);
        if (ROLE_CROSS_CLAN_ADMIN.equals(actualRoleCode)) {
            return member;
        }
        Set<String> allowed = Arrays.stream(roleCodes).collect(Collectors.toSet());
        if (!allowed.contains(actualRoleCode)) {
            throw new BusinessException("AUTH_FORBIDDEN", "当前角色无权执行该操作");
        }
        return member;
    }

    @Transactional(readOnly = true)
    public ClanMemberEntity requireBranchWriteScope(Long clanId, Long userId, Long branchId) {
        ClanMemberEntity member = requireClanMember(clanId, userId);
        String roleCode = roleCode(member);
        if (ROLE_CROSS_CLAN_ADMIN.equals(roleCode) || ROLE_CLAN_ADMIN.equals(roleCode)) {
            return member;
        }
        if (!ROLE_BRANCH_ADMIN.equals(roleCode) && !ROLE_EDITOR.equals(roleCode)) {
            throw new BusinessException("AUTH_FORBIDDEN", "当前角色无权维护该支派数据");
        }
        if (member.getScopeType() == MemberScopeType.clan) {
            return member;
        }
        Long allowedBranchId = member.getScopeId() == null ? member.getBranchId() : member.getScopeId();
        if (!isBranchInScope(clanId, branchId, allowedBranchId)) {
            throw new BusinessException("AUTH_BRANCH_SCOPE_FORBIDDEN", "当前用户无权维护该支派范围的数据");
        }
        return member;
    }

    @Transactional(readOnly = true)
    public ClanMemberEntity requireBranchManagerCandidate(Long clanId, Long memberId, Long branchId) {
        ClanMemberEntity member = clanMemberRepository.findById(memberId)
                .filter(item -> clanId.equals(item.getClanId()))
                .orElseThrow(() -> new BusinessException("BRANCH_MANAGER_NOT_FOUND", "支派负责人必须是当前宗族成员"));
        if (member.getMemberStatus() != MemberStatus.active) {
            throw new BusinessException("BRANCH_MANAGER_INACTIVE", "支派负责人不是有效宗族成员");
        }
        String roleCode = roleCode(member);
        if (!ROLE_CROSS_CLAN_ADMIN.equals(roleCode) && !ROLE_CLAN_ADMIN.equals(roleCode) && !ROLE_BRANCH_ADMIN.equals(roleCode) && !ROLE_EDITOR.equals(roleCode)) {
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
                && findActiveMemberInClan(clanId, userId).isPresent();
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

    private Optional<ClanMemberEntity> findActiveMemberInClan(Long clanId, Long userId) {
        if (clanId == null || userId == null) {
            return Optional.empty();
        }
        return clanMemberRepository.findByClanIdAndUserId(clanId, userId)
                .filter(member -> member.getMemberStatus() == MemberStatus.active);
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

    private boolean isBranchInScope(Long clanId, Long branchId, Long allowedBranchId) {
        if (branchId == null || allowedBranchId == null) {
            return false;
        }
        if (allowedBranchId.equals(branchId)) {
            return true;
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

    private String roleCode(ClanMemberEntity member) {
        return roleRepository.findById(member.getRoleId())
                .map(RoleEntity::getRoleCode)
                .orElseThrow(() -> new BusinessException("ROLE_NOT_FOUND", "成员角色不存在"));
    }
}
