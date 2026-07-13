package com.genealogy.member.domain;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class MemberGrantPolicyService {

    private static final String STATUS_ACTIVE = "active";
    private static final Set<String> CLAN_ADMIN_GRANTABLE_ROLES = Set.of(
            AuthorizationApplicationService.ROLE_CLAN_ADMIN,
            AuthorizationApplicationService.ROLE_BRANCH_ADMIN,
            AuthorizationApplicationService.ROLE_EDITOR,
            AuthorizationApplicationService.ROLE_REVIEWER,
            AuthorizationApplicationService.ROLE_VIEWER
    );
    private static final Set<String> BRANCH_ADMIN_GRANTABLE_ROLES = Set.of(
            AuthorizationApplicationService.ROLE_EDITOR,
            AuthorizationApplicationService.ROLE_VIEWER
    );

    private final AuthorizationApplicationService authorizationApplicationService;
    private final ClanMembershipRepository clanMembershipRepository;
    private final MemberRoleRepository memberRoleRepository;
    private final RoleRepository roleRepository;
    private final BranchRepository branchRepository;

    public MemberGrantPolicyService(
            AuthorizationApplicationService authorizationApplicationService,
            ClanMembershipRepository clanMembershipRepository,
            MemberRoleRepository memberRoleRepository,
            RoleRepository roleRepository,
            BranchRepository branchRepository
    ) {
        this.authorizationApplicationService = authorizationApplicationService;
        this.clanMembershipRepository = clanMembershipRepository;
        this.memberRoleRepository = memberRoleRepository;
        this.roleRepository = roleRepository;
        this.branchRepository = branchRepository;
    }

    public void validateCreate(
            Long clanId,
            Long actorId,
            String targetRoleCode,
            MemberRoleScopeType targetScopeType,
            Long targetScopeId,
            String reason
    ) {
        requireReason(reason);
        validateRoleScope(clanId, targetRoleCode, targetScopeType, targetScopeId);
        requireActorCanManageTarget(clanId, actorId, targetRoleCode, targetScopeType, targetScopeId);
    }

    public void validateUpdate(
            Long clanId,
            Long actorId,
            MemberRoleEntity existingGrant,
            String targetRoleCode,
            MemberRoleScopeType targetScopeType,
            Long targetScopeId,
            String reason
    ) {
        requireReason(reason);
        requireActorCanManageExisting(clanId, actorId, existingGrant);
        validateRoleScope(clanId, targetRoleCode, targetScopeType, targetScopeId);
        requireActorCanManageTarget(clanId, actorId, targetRoleCode, targetScopeType, targetScopeId);

        String existingRoleCode = roleCode(existingGrant.getRoleId());
        boolean remainsClanAdmin = AuthorizationApplicationService.ROLE_CLAN_ADMIN.equals(targetRoleCode)
                && targetScopeType == MemberRoleScopeType.clan
                && clanId.equals(targetScopeId);
        if (isClanAdminGrant(existingGrant, existingRoleCode) && !remainsClanAdmin) {
            requireAnotherClanAdmin(clanId);
        }
    }

    public void validateRevoke(Long clanId, Long actorId, MemberRoleEntity existingGrant, String reason) {
        requireReason(reason);
        requireActorCanManageExisting(clanId, actorId, existingGrant);
        String existingRoleCode = roleCode(existingGrant.getRoleId());
        if (isClanAdminGrant(existingGrant, existingRoleCode)) {
            requireAnotherClanAdmin(clanId);
        }
    }

    public void validateDisableMember(Long clanId, Long membershipId, String reason) {
        requireReason(reason);
        boolean hasClanAdminGrant = memberRoleRepository.findByMembershipIdAndStatus(membershipId, STATUS_ACTIVE).stream()
                .anyMatch(grant -> isClanAdminGrant(grant, roleCode(grant.getRoleId())));
        if (hasClanAdminGrant) {
            requireAnotherClanAdmin(clanId);
        }
    }

    public List<String> grantableRoleCodes(Long clanId, Long actorId) {
        ActorScope actorScope = actorScope(clanId, actorId);
        if (actorScope.crossClanAdmin() || actorScope.clanAdmin()) {
            return CLAN_ADMIN_GRANTABLE_ROLES.stream().sorted().toList();
        }
        if (!actorScope.branchRoots().isEmpty()) {
            return BRANCH_ADMIN_GRANTABLE_ROLES.stream().sorted().toList();
        }
        return List.of();
    }

    private void requireActorCanManageExisting(Long clanId, Long actorId, MemberRoleEntity existingGrant) {
        String existingRoleCode = roleCode(existingGrant.getRoleId());
        requireActorCanManageTarget(
                clanId,
                actorId,
                existingRoleCode,
                existingGrant.getScopeType(),
                existingGrant.getScopeId()
        );
    }

    private void requireActorCanManageTarget(
            Long clanId,
            Long actorId,
            String targetRoleCode,
            MemberRoleScopeType targetScopeType,
            Long targetScopeId
    ) {
        ActorScope actorScope = actorScope(clanId, actorId);
        if (actorScope.crossClanAdmin()) {
            return;
        }
        if (actorScope.clanAdmin()) {
            if (!CLAN_ADMIN_GRANTABLE_ROLES.contains(targetRoleCode)) {
                throw forbidden("当前管理员不能授予该角色");
            }
            return;
        }
        if (!BRANCH_ADMIN_GRANTABLE_ROLES.contains(targetRoleCode)) {
            throw forbidden("支派管理员只能授予编辑或查看角色");
        }
        if (!isBranchScope(targetScopeType) || targetScopeId == null) {
            throw forbidden("支派管理员只能在自身支派子树内授权");
        }
        boolean covered = actorScope.branchRoots().stream()
                .anyMatch(rootId -> branchRepository.isDescendantOrSelf(clanId, rootId, targetScopeId));
        if (!covered) {
            throw forbidden("目标授权范围超出当前操作者的支派范围");
        }
    }

    private ActorScope actorScope(Long clanId, Long actorId) {
        if (authorizationApplicationService.isCrossClanAdmin(actorId)) {
            return new ActorScope(true, false, List.of());
        }
        ClanMembershipEntity membership = clanMembershipRepository
                .findByClanIdAndUserIdAndMemberStatus(clanId, actorId, MemberStatus.active)
                .orElseThrow(() -> forbidden("当前用户不是该宗族的有效成员"));
        List<MemberRoleEntity> grants = memberRoleRepository.findByMembershipIdAndStatus(membership.getId(), STATUS_ACTIVE);
        Map<Long, RoleEntity> roles = roleRepository.findAllById(
                        grants.stream().map(MemberRoleEntity::getRoleId).distinct().toList()
                ).stream()
                .collect(Collectors.toMap(RoleEntity::getId, Function.identity()));

        boolean clanAdmin = grants.stream().anyMatch(grant -> {
            RoleEntity role = roles.get(grant.getRoleId());
            return role != null
                    && AuthorizationApplicationService.ROLE_CLAN_ADMIN.equals(role.getRoleCode())
                    && grant.getScopeType() == MemberRoleScopeType.clan
                    && clanId.equals(grant.getScopeId());
        });
        List<Long> branchRoots = new ArrayList<>();
        grants.forEach(grant -> {
            RoleEntity role = roles.get(grant.getRoleId());
            if (role != null
                    && AuthorizationApplicationService.ROLE_BRANCH_ADMIN.equals(role.getRoleCode())
                    && isBranchScope(grant.getScopeType())
                    && grant.getScopeId() != null) {
                branchRoots.add(grant.getScopeId());
            }
        });
        return new ActorScope(false, clanAdmin, branchRoots.stream().distinct().toList());
    }

    private void validateRoleScope(
            Long clanId,
            String roleCode,
            MemberRoleScopeType scopeType,
            Long scopeId
    ) {
        if (AuthorizationApplicationService.ROLE_CROSS_CLAN_ADMIN.equals(roleCode)) {
            throw new BusinessException("CROSS_CLAN_ADMIN_ASSIGN_FORBIDDEN", "跨宗族管理员不能在宗族成员页面授予");
        }
        if (!CLAN_ADMIN_GRANTABLE_ROLES.contains(roleCode)) {
            throw new BusinessException("MEMBER_ROLE_NOT_GRANTABLE", "该角色不允许通过成员权限接口授予");
        }
        if (AuthorizationApplicationService.ROLE_CLAN_ADMIN.equals(roleCode)
                || AuthorizationApplicationService.ROLE_REVIEWER.equals(roleCode)) {
            requireClanScope(clanId, scopeType, scopeId);
            return;
        }
        if (AuthorizationApplicationService.ROLE_BRANCH_ADMIN.equals(roleCode)) {
            requireBranchSubtreeScope(clanId, scopeType, scopeId);
            return;
        }
        if (scopeType == MemberRoleScopeType.clan) {
            requireClanScope(clanId, scopeType, scopeId);
            return;
        }
        requireBranchSubtreeScope(clanId, scopeType, scopeId);
    }

    private void requireClanScope(Long clanId, MemberRoleScopeType scopeType, Long scopeId) {
        if (scopeType != MemberRoleScopeType.clan || !clanId.equals(scopeId)) {
            throw new BusinessException("MEMBER_ROLE_SCOPE_INVALID", "该角色必须使用全宗族范围");
        }
    }

    private void requireBranchSubtreeScope(Long clanId, MemberRoleScopeType scopeType, Long scopeId) {
        if (!isBranchScope(scopeType) || scopeId == null) {
            throw new BusinessException("MEMBER_ROLE_SCOPE_INVALID", "该角色必须使用支派及下级支派范围");
        }
        if (branchRepository.findByIdAndClanId(scopeId, clanId).isEmpty()) {
            throw new BusinessException("BRANCH_CLAN_MISMATCH", "授权支派不属于当前宗族");
        }
    }

    private void requireAnotherClanAdmin(Long clanId) {
        clanMembershipRepository.lockByClanId(clanId);
        long activeAdminCount = memberRoleRepository.countActiveRoleGrants(
                clanId,
                MemberStatus.active,
                STATUS_ACTIVE,
                AuthorizationApplicationService.ROLE_CLAN_ADMIN,
                MemberRoleScopeType.clan
        );
        if (activeAdminCount <= 1) {
            throw new BusinessException("LAST_CLAN_ADMIN_REQUIRED", "宗族必须至少保留一名有效管理员");
        }
    }

    private boolean isClanAdminGrant(MemberRoleEntity grant, String roleCode) {
        return STATUS_ACTIVE.equals(grant.getStatus())
                && AuthorizationApplicationService.ROLE_CLAN_ADMIN.equals(roleCode)
                && grant.getScopeType() == MemberRoleScopeType.clan;
    }

    private boolean isBranchScope(MemberRoleScopeType scopeType) {
        return scopeType == MemberRoleScopeType.branch || scopeType == MemberRoleScopeType.branch_subtree;
    }

    private String roleCode(Long roleId) {
        return roleRepository.findById(roleId)
                .map(RoleEntity::getRoleCode)
                .orElseThrow(() -> new BusinessException("ROLE_NOT_FOUND", "成员角色不存在"));
    }

    private void requireReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BusinessException("MEMBER_PERMISSION_REASON_REQUIRED", "权限变更必须填写原因");
        }
    }

    private BusinessException forbidden(String message) {
        return new BusinessException("MEMBER_GRANT_FORBIDDEN", message);
    }

    private record ActorScope(boolean crossClanAdmin, boolean clanAdmin, List<Long> branchRoots) {
    }
}
