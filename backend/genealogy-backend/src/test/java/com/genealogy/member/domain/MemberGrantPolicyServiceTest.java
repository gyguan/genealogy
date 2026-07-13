package com.genealogy.member.domain;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import com.genealogy.member.repository.RoleRepository;
import org.junit.jupiter.api.Test;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MemberGrantPolicyServiceTest {

    private final AuthorizationApplicationService authorizationApplicationService = mock(AuthorizationApplicationService.class);
    private final ClanMembershipRepository clanMembershipRepository = mock(ClanMembershipRepository.class);
    private final MemberRoleRepository memberRoleRepository = mock(MemberRoleRepository.class);
    private final RoleRepository roleRepository = mock(RoleRepository.class);
    private final BranchRepository branchRepository = mock(BranchRepository.class);
    private final MemberGrantPolicyService service = new MemberGrantPolicyService(
            authorizationApplicationService,
            clanMembershipRepository,
            memberRoleRepository,
            roleRepository,
            branchRepository
    );

    @Test
    void branchAdminCannotGrantClanAdmin() {
        prepareBranchAdminActor(1L, 100L, 200L, List.of(200L, 203L));

        assertThatThrownBy(() -> service.validateCreate(
                1L,
                100L,
                AuthorizationApplicationService.ROLE_CLAN_ADMIN,
                MemberRoleScopeType.clan,
                1L,
                "越级授权测试"
        )).hasMessageContaining("超出当前操作者");
    }

    @Test
    void branchAdminCanGrantViewerInsideOwnSubtree() {
        prepareBranchAdminActor(1L, 100L, 200L, List.of(200L, 203L));
        when(branchRepository.findByIdAndClanId(203L, 1L)).thenReturn(Optional.of(branch(1L, 203L)));

        assertThatCode(() -> service.validateCreate(
                1L,
                100L,
                AuthorizationApplicationService.ROLE_VIEWER,
                MemberRoleScopeType.branch_subtree,
                203L,
                "授权下级支派查看权限"
        )).doesNotThrowAnyException();
    }

    @Test
    void branchAdminCannotDisableMemberInSiblingBranch() {
        prepareBranchAdminActor(1L, 100L, 200L, List.of(200L, 203L));
        ClanMembershipEntity target = membership(80L, 1L, 300L);
        RoleEntity viewer = role(81L, AuthorizationApplicationService.ROLE_VIEWER);
        MemberRoleEntity siblingGrant = grant(
                82L,
                target.getId(),
                viewer.getId(),
                MemberRoleScopeType.branch_subtree,
                300L
        );
        when(clanMembershipRepository.findById(target.getId())).thenReturn(Optional.of(target));
        when(memberRoleRepository.findByMembershipIdAndStatus(target.getId(), "active"))
                .thenReturn(List.of(siblingGrant));
        when(roleRepository.findAllById(List.of(viewer.getId()))).thenReturn(List.of(viewer));

        assertThatThrownBy(() -> service.validateMemberStatusChange(
                1L,
                100L,
                target.getId(),
                MemberStatus.disabled,
                "停用兄弟支派成员"
        )).hasMessageContaining("超出当前操作者");
    }

    @Test
    void branchAdminCanDisableViewerFullyInsideOwnSubtree() {
        prepareBranchAdminActor(1L, 100L, 200L, List.of(200L, 203L));
        ClanMembershipEntity target = membership(80L, 1L, 300L);
        RoleEntity viewer = role(81L, AuthorizationApplicationService.ROLE_VIEWER);
        MemberRoleEntity insideGrant = grant(
                82L,
                target.getId(),
                viewer.getId(),
                MemberRoleScopeType.branch_subtree,
                203L
        );
        when(clanMembershipRepository.findById(target.getId())).thenReturn(Optional.of(target));
        when(memberRoleRepository.findByMembershipIdAndStatus(target.getId(), "active"))
                .thenReturn(List.of(insideGrant));
        when(roleRepository.findAllById(List.of(viewer.getId()))).thenReturn(List.of(viewer));

        assertThatCode(() -> service.validateMemberStatusChange(
                1L,
                100L,
                target.getId(),
                MemberStatus.disabled,
                "停用本支派成员"
        )).doesNotThrowAnyException();
    }

    @Test
    void cannotRevokeLastClanAdmin() {
        when(authorizationApplicationService.isCrossClanAdmin(999L)).thenReturn(true);
        RoleEntity clanAdminRole = role(10L, AuthorizationApplicationService.ROLE_CLAN_ADMIN);
        MemberRoleEntity clanAdminGrant = grant(20L, 30L, clanAdminRole.getId(), MemberRoleScopeType.clan, 1L);
        when(roleRepository.findById(clanAdminRole.getId())).thenReturn(Optional.of(clanAdminRole));
        when(clanMembershipRepository.lockByClanId(1L)).thenReturn(List.of(membership(30L, 1L, 100L)));
        when(memberRoleRepository.countActiveRoleGrants(
                1L,
                MemberStatus.active,
                "active",
                AuthorizationApplicationService.ROLE_CLAN_ADMIN,
                MemberRoleScopeType.clan
        )).thenReturn(1L);

        assertThatThrownBy(() -> service.validateRevoke(1L, 999L, clanAdminGrant, "撤销管理员"))
                .hasMessageContaining("至少保留一名有效管理员");
    }

    private void prepareBranchAdminActor(
            Long clanId,
            Long actorId,
            Long scopeId,
            Collection<Long> subtreeIds
    ) {
        when(authorizationApplicationService.isCrossClanAdmin(actorId)).thenReturn(false);
        ClanMembershipEntity membership = membership(50L, clanId, actorId);
        RoleEntity role = role(60L, AuthorizationApplicationService.ROLE_BRANCH_ADMIN);
        MemberRoleEntity grant = grant(70L, membership.getId(), role.getId(), MemberRoleScopeType.branch_subtree, scopeId);
        when(clanMembershipRepository.findByClanIdAndUserIdAndMemberStatus(clanId, actorId, MemberStatus.active))
                .thenReturn(Optional.of(membership));
        when(memberRoleRepository.findByMembershipIdAndStatus(membership.getId(), "active"))
                .thenReturn(List.of(grant));
        when(roleRepository.findAllById(List.of(role.getId()))).thenReturn(List.of(role));
        when(branchRepository.findSubtreeIds(eq(clanId), anyCollection()))
                .thenReturn(subtreeIds.stream().toList());
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

    private RoleEntity role(Long id, String roleCode) {
        RoleEntity role = new RoleEntity();
        role.setId(id);
        role.setRoleCode(roleCode);
        role.setRoleName(roleCode);
        return role;
    }

    private BranchEntity branch(Long clanId, Long id) {
        BranchEntity branch = new BranchEntity();
        branch.setId(id);
        branch.setClanId(clanId);
        branch.setBranchName("branch" + id);
        return branch;
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
