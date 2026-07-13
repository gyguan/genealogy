package com.genealogy.member.domain;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.domain.BranchScopeDomainService;
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

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class MemberGrantPolicyService {

    private static final String STATUS_ACTIVE = "active";
    private static final Set<String> SUPPORTED_ROLE_CODES = Set.of(
            AuthorizationApplicationService.ROLE_CLAN_ADMIN,
            AuthorizationApplicationService.ROLE_BRANCH_ADMIN,
            AuthorizationApplicationService.ROLE_EDITOR,
            AuthorizationApplicationService.ROLE_REVIEWER,
            AuthorizationApplicationService.ROLE_VIEWER
    );
    private static final Set<String> HIGH_RISK_ROLE_CODES = Set.of(
            AuthorizationApplicationService.ROLE_CLAN_ADMIN,
            AuthorizationApplicationService.ROLE_REVIEWER
    );

    private final AuthorizationApplicationService authorizationApplicationService;
    private final ClanMembershipRepository clanMembershipRepository;
    private final MemberRoleRepository memberRoleRepository;
    private final RoleRepository roleRepository;
    private final BranchScopeDomainService branchScopeDomainService;

    public MemberGrantPolicyService(
            AuthorizationApplicationService authorizationApplicationService,
            ClanMembershipRepository clanMembershipRepository,
            MemberRoleRepository memberRoleRepository,
            RoleRepository roleRepository,
            BranchScopeDomainService branchScopeDomainService
    ) {
        this.authorizationApplicationService = authorizationApplicationService;
        this.clanMembershipRepository = clanMembershipRepository;
        this.memberRoleRepository = memberRoleRepository;
        this.roleRepository = roleRepository;
        this.branchScopeDomainService = branchScopeDomainService;
    }

    @Transactional(readOnly = true)
    public Set<String> grantableRoleCodes(Long clanId, Long actorId) {
        if (authorizationApplicationService.isCrossClanAdmin(actorId)) {
            return SUPPORTED_ROLE_CODES;
        }
        ClanMembershipEntity actorMembership = activeMembership(clanId, actorId);
        List<MemberRoleEntity> actorGrants = memberRoleRepository.findByMembershipIdAndStatus(actorMembership.getId(), STATUS_ACTIVE);
        Map<Long, String> roleCodes = roleCodes(actorGrants);
        boolean clanAdmin = actorGrants.stream()
                .anyMatch(grant -> AuthorizationApplicationService.ROLE_CLAN_ADMIN.equals(roleCodes.get(grant.getRoleId()))
                        && grant.getScopeType() == MemberRoleScopeType.clan);
        if (clanAdmin) {
            return SUPPORTED_ROLE_CODES;
        }
        boolean branchAdmin = actorGrants.stream()
                .anyMatch(grant -> AuthorizationApplicationService.ROLE_BRANCH_ADMIN.equals(roleCodes.get(grant.getRoleId())));
        return branchAdmin
                ? Set.of(AuthorizationApplicationService.ROLE_EDITOR, AuthorizationApplicationService.ROLE_VIEWER)
                : Set.of();
    }

    @Transactional(readOnly = true)
    public void validateGrant(
            Long clanId,
            Long actorId,
            String targetRoleCode,
            MemberRoleScopeType targetScopeType,
            Long targetScopeId,
            String reason
    ) {
        validateRoleScope(targetRoleCode, targetScopeType);
        if (!grantableRoleCodes(clanId, actorId).contains(targetRoleCode)) {
            throw new BusinessException("MEMBER_ROLE_GRANT_FORBIDDEN", "当前角色无权授予该成员角色");
        }
        if (!authorizationApplicationService.isCrossClanAdmin(actorId)
                && !actorScopeCovers(clanId, actorId, targetRoleCode, targetScopeType, targetScopeId)) {
            throw new BusinessException("MEMBER_SCOPE_GRANT_FORBIDDEN", "授权范围不能超过当前操作者的管理范围");
        }
        if (isHighRisk(targetRoleCode, targetScopeType)) {
            requireReason(reason);
        }
    }

    @Transactional(readOnly = true)
    public void validateGrantUpdate(
            Long clanId,
            Long actorId,
            MemberRoleEntity currentGrant,
            String currentRoleCode,
            String targetRoleCode,
            MemberRoleScopeType targetScopeType,
            Long targetScopeId,
            String reason
    ) {
        validateGrant(clanId, actorId, targetRoleCode, targetScopeType, targetScopeId, reason);
        boolean scopeExpandedToClan = currentGrant.getScopeType() != MemberRoleScopeType.clan
                && targetScopeType == MemberRoleScopeType.clan;
        if (scopeExpandedToClan || !Objects.equals(currentRoleCode, targetRoleCode) && HIGH_RISK_ROLE_CODES.contains(targetRoleCode)) {
            requireReason(reason);
        }
    }

    @Transactional(readOnly = true)
    public void validateRevoke(
            Long clanId,
            Long actorId,
            ClanMembershipEntity targetMembership,
            MemberRoleEntity targetGrant,
            String targetRoleCode,
            String reason
    ) {
        if (!authorizationApplicationService.isCrossClanAdmin(actorId)
                && !actorScopeCovers(clanId, actorId, targetRoleCode, targetGrant.getScopeType(), targetGrant.getScopeId())) {
            throw new BusinessException("MEMBER_ROLE_REVOKE_FORBIDDEN", "当前角色无权撤销该授权");
        }
        if (HIGH_RISK_ROLE_CODES.contains(targetRoleCode) || Objects.equals(actorId, targetMembership.getUserId())) {
            requireReason(reason);
        }
    }

    @Transactional(readOnly = true)
    public void validateMembershipStatusChange(Long clanId, Long actorId, ClanMembershipEntity targetMembership, MemberStatus targetStatus, String reason) {
        if (targetStatus != MemberStatus.active && targetStatus != MemberStatus.inactive) {
            throw new BusinessException("MEMBER_STATUS_INVALID", "成员状态只允许设置为有效或停用");
        }
        if (!grantableRoleCodes(clanId, actorId).contains(AuthorizationApplicationService.ROLE_CLAN_ADMIN)) {
            throw new BusinessException("MEMBER_STATUS_CHANGE_FORBIDDEN", "只有宗族管理员可以停用或恢复成员");
        }
        if (targetStatus == MemberStatus.inactive || Objects.equals(actorId, targetMembership.getUserId())) {
            requireReason(reason);
        }
    }

    @Transactional
    public void ensureAdminContinuityForUpdate(
            Long clanId,
            ClanMembershipEntity targetMembership,
            MemberRoleEntity currentGrant,
            String currentRoleCode,
            String targetRoleCode,
            MemberRoleScopeType targetScopeType
    ) {
        if (isClanAdminGrant(currentGrant, currentRoleCode)
                && !(AuthorizationApplicationService.ROLE_CLAN_ADMIN.equals(targetRoleCode) && targetScopeType == MemberRoleScopeType.clan)) {
            ensureAnotherClanAdmin(clanId, targetMembership.getId(), currentGrant.getId());
        }
    }

    @Transactional
    public void ensureAdminContinuityForRevoke(
            Long clanId,
            ClanMembershipEntity targetMembership,
            MemberRoleEntity targetGrant,
            String targetRoleCode
    ) {
        if (isClanAdminGrant(targetGrant, targetRoleCode)) {
            ensureAnotherClanAdmin(clanId, targetMembership.getId(), targetGrant.getId());
        }
    }

    @Transactional
    public void ensureAdminContinuityForDisable(Long clanId, ClanMembershipEntity targetMembership) {
        List<ClanMembershipEntity> memberships = clanMembershipRepository.lockAllByClanId(clanId);
        List<Long> activeMembershipIds = memberships.stream()
                .filter(item -> item.getMemberStatus() == MemberStatus.active)
                .map(ClanMembershipEntity::getId)
                .toList();
        if (activeMembershipIds.isEmpty()) {
            return;
        }
        List<MemberRoleEntity> grants = memberRoleRepository.findByMembershipIdInAndStatus(activeMembershipIds, STATUS_ACTIVE);
        Map<Long, String> roleCodes = roleCodes(grants);
        boolean targetIsAdmin = grants.stream()
                .filter(grant -> Objects.equals(grant.getMembershipId(), targetMembership.getId()))
                .anyMatch(grant -> isClanAdminGrant(grant, roleCodes.get(grant.getRoleId())));
        if (!targetIsAdmin) {
            return;
        }
        boolean anotherAdmin = grants.stream()
                .filter(grant -> !Objects.equals(grant.getMembershipId(), targetMembership.getId()))
                .anyMatch(grant -> isClanAdminGrant(grant, roleCodes.get(grant.getRoleId())));
        if (!anotherAdmin) {
            throw new BusinessException("LAST_CLAN_ADMIN_REQUIRED", "宗族必须至少保留一名有效管理员");
        }
    }

    public boolean isHighRisk(String roleCode, MemberRoleScopeType scopeType) {
        return HIGH_RISK_ROLE_CODES.contains(roleCode) || scopeType == MemberRoleScopeType.clan;
    }

    public void requireReason(String reason) {
        String normalized = reason == null ? "" : reason.trim();
        if (normalized.length() < 5 || normalized.length() > 200) {
            throw new BusinessException("MEMBER_CHANGE_REASON_REQUIRED", "高风险权限变更原因需填写 5 到 200 个字符");
        }
    }

    private void validateRoleScope(String roleCode, MemberRoleScopeType scopeType) {
        if (!SUPPORTED_ROLE_CODES.contains(roleCode)) {
            throw new BusinessException("MEMBER_ROLE_NOT_SUPPORTED", "该角色不能通过成员权限页面授予");
        }
        boolean allowed = switch (roleCode) {
            case AuthorizationApplicationService.ROLE_CLAN_ADMIN, AuthorizationApplicationService.ROLE_REVIEWER -> scopeType == MemberRoleScopeType.clan;
            case AuthorizationApplicationService.ROLE_BRANCH_ADMIN -> scopeType == MemberRoleScopeType.branch_subtree;
            case AuthorizationApplicationService.ROLE_EDITOR, AuthorizationApplicationService.ROLE_VIEWER ->
                    scopeType == MemberRoleScopeType.clan || scopeType == MemberRoleScopeType.branch_subtree;
            default -> false;
        };
        if (!allowed) {
            throw new BusinessException("MEMBER_ROLE_SCOPE_INVALID", "角色与授权范围不匹配");
        }
    }

    private boolean actorScopeCovers(
            Long clanId,
            Long actorId,
            String targetRoleCode,
            MemberRoleScopeType targetScopeType,
            Long targetScopeId
    ) {
        ClanMembershipEntity actorMembership = activeMembership(clanId, actorId);
        List<MemberRoleEntity> actorGrants = memberRoleRepository.findByMembershipIdAndStatus(actorMembership.getId(), STATUS_ACTIVE);
        Map<Long, String> roleCodes = roleCodes(actorGrants);
        return actorGrants.stream().anyMatch(actorGrant -> {
            String actorRoleCode = roleCodes.get(actorGrant.getRoleId());
            if (!canRoleGrant(actorRoleCode, targetRoleCode)) {
                return false;
            }
            return branchScopeDomainService.scopeCovers(
                    clanId,
                    actorGrant.getScopeType(),
                    actorGrant.getScopeId(),
                    targetScopeType,
                    targetScopeId
            );
        });
    }

    private boolean canRoleGrant(String actorRoleCode, String targetRoleCode) {
        if (AuthorizationApplicationService.ROLE_CLAN_ADMIN.equals(actorRoleCode)) {
            return SUPPORTED_ROLE_CODES.contains(targetRoleCode);
        }
        return AuthorizationApplicationService.ROLE_BRANCH_ADMIN.equals(actorRoleCode)
                && Set.of(AuthorizationApplicationService.ROLE_EDITOR, AuthorizationApplicationService.ROLE_VIEWER).contains(targetRoleCode);
    }

    private ClanMembershipEntity activeMembership(Long clanId, Long actorId) {
        return clanMembershipRepository.findByClanIdAndUserIdAndMemberStatus(clanId, actorId, MemberStatus.active)
                .orElseThrow(() -> new BusinessException("AUTH_FORBIDDEN", "当前用户不是有效宗族成员"));
    }

    private void ensureAnotherClanAdmin(Long clanId, Long targetMembershipId, Long targetGrantId) {
        List<ClanMembershipEntity> memberships = clanMembershipRepository.lockAllByClanId(clanId);
        List<Long> activeMembershipIds = memberships.stream()
                .filter(item -> item.getMemberStatus() == MemberStatus.active)
                .map(ClanMembershipEntity::getId)
                .toList();
        List<MemberRoleEntity> grants = activeMembershipIds.isEmpty()
                ? List.of()
                : memberRoleRepository.findByMembershipIdInAndStatus(activeMembershipIds, STATUS_ACTIVE);
        Map<Long, String> roleCodes = roleCodes(grants);
        boolean anotherAdmin = grants.stream()
                .filter(grant -> !Objects.equals(grant.getId(), targetGrantId))
                .filter(grant -> !Objects.equals(grant.getMembershipId(), targetMembershipId) || !Objects.equals(grant.getId(), targetGrantId))
                .anyMatch(grant -> isClanAdminGrant(grant, roleCodes.get(grant.getRoleId())));
        if (!anotherAdmin) {
            throw new BusinessException("LAST_CLAN_ADMIN_REQUIRED", "宗族必须至少保留一名有效管理员");
        }
    }

    private boolean isClanAdminGrant(MemberRoleEntity grant, String roleCode) {
        return AuthorizationApplicationService.ROLE_CLAN_ADMIN.equals(roleCode)
                && grant.getScopeType() == MemberRoleScopeType.clan
                && STATUS_ACTIVE.equals(grant.getStatus());
    }

    private Map<Long, String> roleCodes(List<MemberRoleEntity> grants) {
        List<Long> roleIds = grants.stream().map(MemberRoleEntity::getRoleId).filter(Objects::nonNull).distinct().toList();
        if (roleIds.isEmpty()) {
            return Map.of();
        }
        return roleRepository.findAllById(roleIds).stream()
                .collect(Collectors.toMap(RoleEntity::getId, RoleEntity::getRoleCode, (first, second) -> first));
    }
}
