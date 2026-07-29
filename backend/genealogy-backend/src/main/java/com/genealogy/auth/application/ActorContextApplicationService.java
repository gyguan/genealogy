package com.genealogy.auth.application;

import com.genealogy.auth.dto.ActorContext;
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

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ActorContextApplicationService {

    private static final String STATUS_ACTIVE = "active";

    private final ClanMembershipRepository membershipRepository;
    private final MemberRoleRepository memberRoleRepository;
    private final RoleRepository roleRepository;
    private final PermissionApplicationService permissionApplicationService;

    public ActorContextApplicationService(
            ClanMembershipRepository membershipRepository,
            MemberRoleRepository memberRoleRepository,
            RoleRepository roleRepository,
            PermissionApplicationService permissionApplicationService
    ) {
        this.membershipRepository = membershipRepository;
        this.memberRoleRepository = memberRoleRepository;
        this.roleRepository = roleRepository;
        this.permissionApplicationService = permissionApplicationService;
    }

    @Transactional(readOnly = true)
    public ActorContext resolve(Long clanId, Long userId) {
        if (userId == null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "请先登录");
        }
        if (clanId == null) {
            throw new BusinessException("VALIDATION_ERROR", "宗族不能为空");
        }

        List<ClanMembershipEntity> memberships = membershipRepository
                .findByUserIdAndMemberStatus(userId, MemberStatus.active);
        Map<Long, List<MemberRoleEntity>> rolesByMembership = new HashMap<>();
        Set<Long> roleIds = new HashSet<>();
        for (ClanMembershipEntity membership : memberships) {
            List<MemberRoleEntity> roles = memberRoleRepository
                    .findByMembershipIdAndStatus(membership.getId(), STATUS_ACTIVE);
            rolesByMembership.put(membership.getId(), roles);
            roles.stream().map(MemberRoleEntity::getRoleId).forEach(roleIds::add);
        }

        Map<Long, RoleEntity> roleById = roleRepository.findAllById(roleIds).stream()
                .collect(Collectors.toMap(RoleEntity::getId, item -> item));
        boolean crossClanAdmin = rolesByMembership.values().stream()
                .flatMap(List::stream)
                .map(MemberRoleEntity::getRoleId)
                .map(roleById::get)
                .filter(item -> item != null)
                .map(RoleEntity::getRoleCode)
                .anyMatch(AuthorizationApplicationService.ROLE_CROSS_CLAN_ADMIN::equals);

        ClanMembershipEntity targetMembership = memberships.stream()
                .filter(item -> clanId.equals(item.getClanId()))
                .findFirst()
                .orElse(null);
        if (targetMembership == null && !crossClanAdmin) {
            throw new BusinessException("AUTH_FORBIDDEN", "当前用户不是该宗族成员");
        }

        List<MemberRoleEntity> targetRoles = targetMembership == null
                ? List.of()
                : rolesByMembership.getOrDefault(targetMembership.getId(), List.of());
        Set<String> roleCodes = targetRoles.stream()
                .map(MemberRoleEntity::getRoleId)
                .map(roleById::get)
                .filter(item -> item != null)
                .map(RoleEntity::getRoleCode)
                .collect(Collectors.toUnmodifiableSet());
        Set<String> permissions = roleCodes.stream()
                .flatMap(roleCode -> permissionApplicationService.permissionsForRoleCode(roleCode).stream())
                .collect(Collectors.toUnmodifiableSet());
        Set<Long> branchScopes = targetRoles.stream()
                .filter(item -> item.getScopeType() == MemberRoleScopeType.branch
                        || item.getScopeType() == MemberRoleScopeType.branch_subtree)
                .map(MemberRoleEntity::getScopeId)
                .filter(item -> item != null)
                .collect(Collectors.toUnmodifiableSet());

        return new ActorContext(
                userId,
                clanId,
                targetMembership == null ? null : targetMembership.getId(),
                roleCodes,
                permissions,
                branchScopes,
                crossClanAdmin,
                null,
                null
        );
    }
}
