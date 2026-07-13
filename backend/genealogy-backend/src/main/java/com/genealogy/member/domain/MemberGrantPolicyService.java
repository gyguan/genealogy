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

import java.util.LinkedHashSet;
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

    public void validateMemberStatusChange(
            Long clanId,
            Long actorId,
            Long membershipId,
            MemberStatus targetStatus,
            String reason
    ) {
        requireReason(reason);
        clanMembershipRepository.findById(membershipId)
                .filter(membership -> clanId.equals(membership.getClanId()))
                .orElseThrow(() -> new BusinessException("MEMBER_NOT_FOUND", "宗族成员不存在"));

        ActorScope scope = actorScope(clanId, actorId);
        List<MemberRoleEntity> grants = memberRoleRepository.findByMembershipIdAndStatus(membershipId, STATUS_ACTIVE);
        Map<Long, RoleEntity> roles = rolesById(grants);
        if (!canManageMembership(scope, grants, roles)) {
            throw forbidden("目标成员超出当前操作者的管理范围");
        }

        if ((targetStatus == MemberStatus.disabled || targetStatus == MemberStatus.removed)
                && containsClanAdminGrant(grants, roles)) {
            requireAnotherClanAdmin(clanId);
        }
    }

    public List<String> grantableRoleCodes(Long clanId, Long actorId) {
        ActorScope actorScope = actorScope(clanId, actorId);
        if (actorScope.fullClanAccess()) {
            return CLAN_ADMIN_GRANTABLE_ROLES.stream().sorted().toList();
        }
        if (!actorScope.visibleBranchIds().isEmpty()) {
            return BRANCH_ADMIN_GRANTABLE_ROLES.stream().sorted().toList();
        }
        return List.of();
    }

    public ActorScope actorScope(Long clanId, Long actorId) {
        if (authorizationApplicationService.isCrossClanAdmin(actorId)) {
            return ActorScope.full(true, false);
        }
        ClanMembershipEntity membership = clanMembershipRepository
                .findByClanIdAndUserIdAndMemberStatus(clanId, actorId, MemberStatus.active)
                .orElseThrow(() -> forbidden("当前用户不是该宗族的有效成员"));
        List<MemberRoleEntity> grants = memberRoleRepository.findByMembershipIdAndStatus(membership.getId(), STATUS_ACTIVE);
        Map<Long, RoleEntity> roles = rolesById(grants);

        boolean clanAdmin = grants.stream().anyMatch(grant -> {
            RoleEntity role = roles.get(grant.getRoleId());
            return role != null
                    && AuthorizationApplicationService.ROLE_CLAN_ADMIN.equals(role.getRoleCode())
                    && grant.getScopeType() == MemberRoleScopeType.clan
                    && clanId.equals(grant.getScopeId());
        });
        if (clanAdmin) {
            return ActorScope.full(false, true);
        }

        Set<Long> exactBranchIds = new LinkedHashSet<>();
        Set<Long> subtreeRoots = new LinkedHashSet<>();
        grants.forEach(grant -> {
            RoleEntity role = roles.get(grant.getRoleId());
            if (role == null
                    || !AuthorizationApplicationService.ROLE_BRANCH_ADMIN.equals(role.getRoleCode())
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

    public boolean canViewGrant(
            ActorScope actorScope,
            MemberRoleScopeType targetScopeType,
            Long targetScopeId
    ) {
        if (actorScope.fullClanAccess()) {
            return true;
        }
        if (targetScopeId == null) {
            return false;
        }
        if (targetScopeType == MemberRoleScopeType.branch) {
            return actorScope.visibleBranchIds().contains(targetScopeId);
        }
        if (targetScopeType == MemberRoleScopeType.branch_subtree) {
            return actorScope.visibleSubtreeIds().contains(targetScopeId);
        }
        return false;
    }

    public boolean canManageGrant(
            ActorScope actorScope,
            String targetRoleCode,
            MemberRoleScopeType targetScopeType,
            Long targetScopeId
    ) {
        if (actorScope.fullClanAccess()) {
            return CLAN_ADMIN_GRANTABLE_ROLES.contains(targetRoleCode);
        }
        if (!BRANCH_ADMIN_GRANTABLE_ROLES.contains(targetRoleCode) || targetScopeId == null) {
            return false;
        }
        if (targetScopeType == MemberRoleScopeType.branch) {
            return actorScope.visibleBranchIds().contains(targetScopeId);
        }
        if (targetScopeType == MemberRoleScopeType.branch_subtree) {
            return actorScope.visibleSubtreeIds().contains(targetScopeId);
        }
        return false;
    }

    public boolean canManageMembership(
            ActorScope actorScope,
            List<MemberRoleEntity> activeGrants,
            Map<Long, RoleEntity> roles
    ) {
        if (actorScope.fullClanAccess()) {
            return true;
        }
        if (activeGrants.isEmpty()) {
            return false;
        }
        return activeGrants.stream().allMatch(grant -> {
            RoleEntity role = roles.get(grant.getRoleId());
            return role != null && canManageGrant(
                    actorScope,
                    role.getRoleCode(),
                    grant.getScopeType(),
                    grant.getScopeId()
            );
        });
    }

    public boolean containsClanAdminGrant(List<MemberRoleEntity> grants, Map<Long, RoleEntity> roles) {
        return grants.stream().anyMatch(grant -> {
            RoleEntity role = roles.get(grant.getRoleId());
            return role != null && isClanAdminGrant(grant, role.getRoleCode());
        });
    }

    public long activeClanAdminCount(Long clanId) {
        return memberRoleRepository.countActiveRoleGrants(
                clanId,
                MemberStatus.active,
                STATUS_ACTIVE,
                AuthorizationApplicationService.ROLE_CLAN_ADMIN,
                MemberRoleScopeType.clan
        );
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
        if (!canManageGrant(actorScope(clanId, actorId), targetRoleCode, targetScopeType, targetScopeId)) {
            throw forbidden("目标授权角色或范围超出当前操作者的管理边界");
        }
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
        if (scopeType != MemberRoleScopeType.branch_subtree || scopeId == null) {
            throw new BusinessException("MEMBER_ROLE_SCOPE_INVALID", "该角色必须使用支派及下级支派范围");
        }
        if (branchRepository.findByIdAndClanId(scopeId, clanId).isEmpty()) {
            throw new BusinessException("BRANCH_CLAN_MISMATCH", "授权支派不属于当前宗族");
        }
    }

    private void requireAnotherClanAdmin(Long clanId) {
        clanMembershipRepository.lockByClanId(clanId);
        if (activeClanAdminCount(clanId) <= 1) {
            throw new BusinessException("LAST_CLAN_ADMIN_REQUIRED", "宗族必须至少保留一名有效管理员");
        }
    }

    private boolean isClanAdminGrant(MemberRoleEntity grant, String roleCode) {
        return STATUS_ACTIVE.equals(grant.getStatus())
                && AuthorizationApplicationService.ROLE_CLAN_ADMIN.equals(roleCode)
                && grant.getScopeType() == MemberRoleScopeType.clan;
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

    private void requireReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BusinessException("MEMBER_PERMISSION_REASON_REQUIRED", "权限变更必须填写原因");
        }
    }

    private BusinessException forbidden(String message) {
        return new BusinessException("MEMBER_GRANT_FORBIDDEN", message);
    }

    public record ActorScope(
            boolean crossClanAdmin,
            boolean clanAdmin,
            Set<Long> visibleBranchIds,
            Set<Long> visibleSubtreeIds
    ) {
        public static ActorScope full(boolean crossClanAdmin, boolean clanAdmin) {
            return new ActorScope(crossClanAdmin, clanAdmin, Set.of(), Set.of());
        }

        public boolean fullClanAccess() {
            return crossClanAdmin || clanAdmin;
        }

        public List<Long> queryVisibleBranchIds() {
            return visibleBranchIds.isEmpty() ? List.of(-1L) : visibleBranchIds.stream().sorted().toList();
        }

        public List<Long> queryVisibleSubtreeIds() {
            return visibleSubtreeIds.isEmpty() ? List.of(-1L) : visibleSubtreeIds.stream().sorted().toList();
        }
    }
}
