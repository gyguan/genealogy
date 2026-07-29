package com.genealogy.member.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.domain.MemberGrantPolicy;
import com.genealogy.member.domain.MemberGrantPolicyService.ActorScope;
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

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class MemberGrantPolicyService implements com.genealogy.member.domain.MemberGrantPolicyService {

    private final AuthorizationApplicationService authorizationApplicationService;
    private final ClanMembershipRepository clanMembershipRepository;
    private final MemberRoleRepository memberRoleRepository;
    private final RoleRepository roleRepository;
    private final BranchRepository branchRepository;
    private final MemberGrantPolicy policy = new MemberGrantPolicy();

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

    @Override
    @Transactional(readOnly = true)
    public void validateCreate(
            Long clanId,
            Long actorId,
            String targetRoleCode,
            MemberRoleScopeType targetScopeType,
            Long targetScopeId,
            String reason
    ) {
        policy.requireReason(reason);
        policy.validateRoleScope(
                clanId,
                targetRoleCode,
                targetScopeType,
                targetScopeId,
                branchBelongsToClan(clanId, targetScopeType, targetScopeId)
        );
        policy.requireCanManageGrant(actorScope(clanId, actorId), targetRoleCode, targetScopeType, targetScopeId);
    }

    @Override
    @Transactional
    public void validateUpdate(
            Long clanId,
            Long actorId,
            MemberRoleEntity existingGrant,
            String targetRoleCode,
            MemberRoleScopeType targetScopeType,
            Long targetScopeId,
            String reason
    ) {
        policy.requireReason(reason);
        String existingRoleCode = roleCode(existingGrant.getRoleId());
        policy.requireCanManageGrant(
                actorScope(clanId, actorId),
                existingRoleCode,
                existingGrant.getScopeType(),
                existingGrant.getScopeId()
        );
        policy.validateRoleScope(
                clanId,
                targetRoleCode,
                targetScopeType,
                targetScopeId,
                branchBelongsToClan(clanId, targetScopeType, targetScopeId)
        );
        policy.requireCanManageGrant(actorScope(clanId, actorId), targetRoleCode, targetScopeType, targetScopeId);
        boolean remainsClanAdmin = MemberGrantPolicy.ROLE_CLAN_ADMIN.equals(targetRoleCode)
                && targetScopeType == MemberRoleScopeType.clan
                && clanId.equals(targetScopeId);
        requireAnotherClanAdmin(clanId, policy.isClanAdminGrant(existingGrant, existingRoleCode) && !remainsClanAdmin);
    }

    @Override
    @Transactional
    public void validateRevoke(Long clanId, Long actorId, MemberRoleEntity existingGrant, String reason) {
        policy.requireReason(reason);
        String roleCode = roleCode(existingGrant.getRoleId());
        policy.requireCanManageGrant(
                actorScope(clanId, actorId),
                roleCode,
                existingGrant.getScopeType(),
                existingGrant.getScopeId()
        );
        requireAnotherClanAdmin(clanId, policy.isClanAdminGrant(existingGrant, roleCode));
    }

    @Override
    @Transactional
    public void validateMemberStatusChange(
            Long clanId,
            Long actorId,
            Long membershipId,
            MemberStatus targetStatus,
            String reason
    ) {
        policy.requireReason(reason);
        clanMembershipRepository.findById(membershipId)
                .filter(membership -> clanId.equals(membership.getClanId()))
                .orElseThrow(() -> new BusinessException("MEMBER_NOT_FOUND", "宗族成员不存在"));
        ActorScope scope = actorScope(clanId, actorId);
        List<MemberRoleEntity> grants = memberRoleRepository.findByMembershipIdAndStatus(
                membershipId,
                MemberGrantPolicy.STATUS_ACTIVE
        );
        Map<Long, RoleEntity> roles = rolesById(grants);
        policy.requireManageableMembership(scope, grants, roles);
        requireAnotherClanAdmin(
                clanId,
                policy.statusRemovesAccess(targetStatus) && policy.containsClanAdminGrant(grants, roles)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> grantableRoleCodes(Long clanId, Long actorId) {
        return policy.grantableRoleCodes(actorScope(clanId, actorId));
    }

    @Override
    @Transactional(readOnly = true)
    public ActorScope actorScope(Long clanId, Long actorId) {
        if (authorizationApplicationService.isCrossClanAdmin(actorId)) {
            return ActorScope.full(true, false);
        }
        ClanMembershipEntity membership = clanMembershipRepository
                .findByClanIdAndUserIdAndMemberStatus(clanId, actorId, MemberStatus.active)
                .orElseThrow(() -> new BusinessException(
                        "MEMBER_GRANT_FORBIDDEN",
                        "当前用户不是该宗族的有效成员"
                ));
        List<MemberRoleEntity> grants = memberRoleRepository.findByMembershipIdAndStatus(
                membership.getId(),
                MemberGrantPolicy.STATUS_ACTIVE
        );
        Map<Long, RoleEntity> roles = rolesById(grants);
        boolean clanAdmin = grants.stream().anyMatch(grant -> {
            RoleEntity role = roles.get(grant.getRoleId());
            return role != null
                    && MemberGrantPolicy.ROLE_CLAN_ADMIN.equals(role.getRoleCode())
                    && grant.getScopeType() == MemberRoleScopeType.clan
                    && clanId.equals(grant.getScopeId());
        });
        if (clanAdmin) return ActorScope.full(false, true);

        Set<Long> exactBranchIds = new LinkedHashSet<>();
        Set<Long> subtreeRoots = new LinkedHashSet<>();
        grants.forEach(grant -> {
            RoleEntity role = roles.get(grant.getRoleId());
            if (role == null
                    || !MemberGrantPolicy.ROLE_BRANCH_ADMIN.equals(role.getRoleCode())
                    || grant.getScopeId() == null) {
                return;
            }
            if (grant.getScopeType() == MemberRoleScopeType.branch) {
                exactBranchIds.add(grant.getScopeId());
            } else if (grant.getScopeType() == MemberRoleScopeType.branch_subtree) {
                subtreeRoots.add(grant.getScopeId());
            }
        });
        Set<Long> subtreeBranchIds = subtreeRoots.isEmpty()
                ? new LinkedHashSet<>()
                : new LinkedHashSet<>(branchRepository.findSubtreeIds(clanId, subtreeRoots));
        exactBranchIds.addAll(subtreeBranchIds);
        return new ActorScope(
                false,
                false,
                Set.copyOf(exactBranchIds),
                Set.copyOf(subtreeBranchIds)
        );
    }

    @Override
    public boolean canViewGrant(ActorScope scope, MemberRoleScopeType targetScopeType, Long targetScopeId) {
        return policy.canViewGrant(scope, targetScopeType, targetScopeId);
    }

    @Override
    public boolean canManageGrant(
            ActorScope scope,
            String targetRoleCode,
            MemberRoleScopeType targetScopeType,
            Long targetScopeId
    ) {
        return policy.canManageGrant(scope, targetRoleCode, targetScopeType, targetScopeId);
    }

    @Override
    public boolean canManageMembership(
            ActorScope scope,
            List<MemberRoleEntity> grants,
            Map<Long, RoleEntity> roles
    ) {
        return policy.canManageMembership(scope, grants, roles);
    }

    @Override
    public boolean containsClanAdminGrant(List<MemberRoleEntity> grants, Map<Long, RoleEntity> roles) {
        return policy.containsClanAdminGrant(grants, roles);
    }

    @Override
    @Transactional(readOnly = true)
    public long activeClanAdminCount(Long clanId) {
        return memberRoleRepository.countActiveRoleGrants(
                clanId,
                MemberStatus.active,
                MemberGrantPolicy.STATUS_ACTIVE,
                MemberGrantPolicy.ROLE_CLAN_ADMIN,
                MemberRoleScopeType.clan
        );
    }

    private boolean branchBelongsToClan(
            Long clanId,
            MemberRoleScopeType scopeType,
            Long scopeId
    ) {
        if (scopeType == MemberRoleScopeType.clan) return true;
        return scopeId != null && branchRepository.findByIdAndClanId(scopeId, clanId).isPresent();
    }

    private void requireAnotherClanAdmin(Long clanId, boolean removingClanAdmin) {
        if (!removingClanAdmin) return;
        clanMembershipRepository.lockByClanId(clanId);
        policy.requireAnotherClanAdmin(true, activeClanAdminCount(clanId));
    }

    private Map<Long, RoleEntity> rolesById(List<MemberRoleEntity> grants) {
        return roleRepository.findAllById(
                        grants.stream().map(MemberRoleEntity::getRoleId).distinct().toList()
                ).stream()
                .collect(Collectors.toMap(RoleEntity::getId, Function.identity()));
    }

    private String roleCode(Long roleId) {
        return roleRepository.findById(roleId)
                .map(RoleEntity::getRoleCode)
                .orElseThrow(() -> new BusinessException("ROLE_NOT_FOUND", "成员角色不存在"));
    }
}
