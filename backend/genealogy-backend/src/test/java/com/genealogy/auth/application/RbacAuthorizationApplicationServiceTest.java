package com.genealogy.auth.application;

import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RbacAuthorizationApplicationServiceTest {

    private final AuthApplicationService authApplicationService = mock(AuthApplicationService.class);
    private final PermissionApplicationService permissionApplicationService = mock(PermissionApplicationService.class);
    private final ClanMembershipRepository clanMembershipRepository = mock(ClanMembershipRepository.class);
    private final MemberRoleRepository memberRoleRepository = mock(MemberRoleRepository.class);
    private final BranchRepository branchRepository = mock(BranchRepository.class);
    private final RbacAuthorizationApplicationService service = new RbacAuthorizationApplicationService(
            authApplicationService,
            permissionApplicationService,
            clanMembershipRepository,
            memberRoleRepository,
            branchRepository
    );

    @Test
    void branchSubtreeGrantCoversDescendantBranch() {
        ClanMembershipEntity membership = membership(10L, 1L, 100L);
        MemberRoleEntity grant = grant(20L, membership.getId(), 30L, MemberRoleScopeType.branch_subtree, 200L);
        when(clanMembershipRepository.findByClanIdAndUserIdAndMemberStatus(1L, 100L, MemberStatus.active))
                .thenReturn(Optional.of(membership));
        when(memberRoleRepository.findByMembershipIdInAndStatus(List.of(10L), "active"))
                .thenReturn(List.of(grant));
        when(permissionApplicationService.roleHasPermission(30L, "person.view")).thenReturn(true);
        when(branchRepository.isDescendantOrSelf(1L, 200L, 203L)).thenReturn(true);

        assertThat(service.hasPermission(
                100L,
                1L,
                "person.view",
                MemberRoleScopeType.branch,
                203L
        )).isTrue();
    }

    @Test
    void branchSubtreeGrantDoesNotCoverSiblingBranch() {
        ClanMembershipEntity membership = membership(10L, 1L, 100L);
        MemberRoleEntity grant = grant(20L, membership.getId(), 30L, MemberRoleScopeType.branch_subtree, 200L);
        when(clanMembershipRepository.findByClanIdAndUserIdAndMemberStatus(1L, 100L, MemberStatus.active))
                .thenReturn(Optional.of(membership));
        when(memberRoleRepository.findByMembershipIdInAndStatus(List.of(10L), "active"))
                .thenReturn(List.of(grant));
        when(permissionApplicationService.roleHasPermission(30L, "person.view")).thenReturn(true);
        when(branchRepository.isDescendantOrSelf(1L, 200L, 300L)).thenReturn(false);

        assertThat(service.hasPermission(
                100L,
                1L,
                "person.view",
                MemberRoleScopeType.branch,
                300L
        )).isFalse();
    }

    private ClanMembershipEntity membership(Long id, Long clanId, Long userId) {
        ClanMembershipEntity membership = new ClanMembershipEntity();
        membership.setId(id);
        membership.setClanId(clanId);
        membership.setUserId(userId);
        membership.setJoinStatus("joined");
        membership.setMemberStatus(MemberStatus.active);
        return membership;
    }

    private MemberRoleEntity grant(
            Long id,
            Long membershipId,
            Long roleId,
            MemberRoleScopeType scopeType,
            Long scopeId
    ) {
        MemberRoleEntity grant = new MemberRoleEntity();
        grant.setId(id);
        grant.setMembershipId(membershipId);
        grant.setRoleId(roleId);
        grant.setScopeType(scopeType);
        grant.setScopeId(scopeId);
        grant.setStatus("active");
        return grant;
    }
}
