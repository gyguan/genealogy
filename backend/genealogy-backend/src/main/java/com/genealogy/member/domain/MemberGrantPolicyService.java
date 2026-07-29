package com.genealogy.member.domain;

import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Adapter-free member grant policy contract. Persistence and authorization context
 * loading are implemented by the application layer.
 */
public interface MemberGrantPolicyService {

    void validateCreate(Long clanId, Long actorId, String targetRoleCode,
                        MemberRoleScopeType targetScopeType, Long targetScopeId, String reason);

    void validateUpdate(Long clanId, Long actorId, MemberRoleEntity existingGrant,
                        String targetRoleCode, MemberRoleScopeType targetScopeType,
                        Long targetScopeId, String reason);

    void validateRevoke(Long clanId, Long actorId, MemberRoleEntity existingGrant, String reason);

    void validateMemberStatusChange(Long clanId, Long actorId, Long membershipId,
                                    MemberStatus targetStatus, String reason);

    List<String> grantableRoleCodes(Long clanId, Long actorId);

    ActorScope actorScope(Long clanId, Long actorId);

    boolean canViewGrant(ActorScope actorScope, MemberRoleScopeType targetScopeType, Long targetScopeId);

    boolean canManageGrant(ActorScope actorScope, String targetRoleCode,
                           MemberRoleScopeType targetScopeType, Long targetScopeId);

    boolean canManageMembership(ActorScope actorScope, List<MemberRoleEntity> activeGrants,
                                Map<Long, RoleEntity> roles);

    boolean containsClanAdminGrant(List<MemberRoleEntity> grants, Map<Long, RoleEntity> roles);

    long activeClanAdminCount(Long clanId);

    record ActorScope(boolean crossClanAdmin, boolean clanAdmin,
                      Set<Long> visibleBranchIds, Set<Long> visibleSubtreeIds) {
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
