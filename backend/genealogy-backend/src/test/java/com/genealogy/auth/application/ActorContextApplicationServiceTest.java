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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActorContextApplicationServiceTest {

    @Mock ClanMembershipRepository membershipRepository;
    @Mock MemberRoleRepository memberRoleRepository;
    @Mock RoleRepository roleRepository;
    @Mock PermissionApplicationService permissionApplicationService;

    private ActorContextApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ActorContextApplicationService(
                membershipRepository, memberRoleRepository, roleRepository, permissionApplicationService
        );
    }

    @Test
    void shouldResolveMembershipRolesPermissionsAndBranchScopesOnce() {
        ClanMembershipEntity membership = membership(10L, 1L, 7L);
        MemberRoleEntity roleGrant = roleGrant(20L, 10L, 30L, MemberRoleScopeType.branch, 99L);
        RoleEntity role = role(30L, AuthorizationApplicationService.ROLE_EDITOR);
        when(membershipRepository.findByUserIdAndMemberStatus(7L, MemberStatus.active))
                .thenReturn(List.of(membership));
        when(memberRoleRepository.findByMembershipIdAndStatus(10L, "active"))
                .thenReturn(List.of(roleGrant));
        when(roleRepository.findAllById(Set.of(30L))).thenReturn(List.of(role));
        when(permissionApplicationService.permissionsForRoleCode(AuthorizationApplicationService.ROLE_EDITOR))
                .thenReturn(Set.of("source:view", "source:bind"));

        ActorContext context = service.resolve(1L, 7L);

        assertThat(context.userId()).isEqualTo(7L);
        assertThat(context.clanId()).isEqualTo(1L);
        assertThat(context.membershipId()).isEqualTo(10L);
        assertThat(context.roleCodes()).containsExactly(AuthorizationApplicationService.ROLE_EDITOR);
        assertThat(context.permissions()).containsExactlyInAnyOrder("source:view", "source:bind");
        assertThat(context.branchScopeIds()).containsExactly(99L);
        assertThat(context.crossClanAdmin()).isFalse();
        verify(membershipRepository).findByUserIdAndMemberStatus(7L, MemberStatus.active);
        verify(memberRoleRepository).findByMembershipIdAndStatus(10L, "active");
    }

    @Test
    void shouldAllowCrossClanAdministratorWithoutDirectMembership() {
        ClanMembershipEntity membership = membership(10L, 2L, 7L);
        MemberRoleEntity roleGrant = roleGrant(20L, 10L, 30L, MemberRoleScopeType.global, 2L);
        RoleEntity role = role(30L, AuthorizationApplicationService.ROLE_CROSS_CLAN_ADMIN);
        when(membershipRepository.findByUserIdAndMemberStatus(7L, MemberStatus.active))
                .thenReturn(List.of(membership));
        when(memberRoleRepository.findByMembershipIdAndStatus(10L, "active"))
                .thenReturn(List.of(roleGrant));
        when(roleRepository.findAllById(Set.of(30L))).thenReturn(List.of(role));

        ActorContext context = service.resolve(1L, 7L);

        assertThat(context.membershipId()).isNull();
        assertThat(context.crossClanAdmin()).isTrue();
        assertThat(context.hasPermission("anything")).isTrue();
    }

    @Test
    void shouldRejectUserWithoutTargetClanMembershipOrCrossClanRole() {
        when(membershipRepository.findByUserIdAndMemberStatus(7L, MemberStatus.active))
                .thenReturn(List.of());
        when(roleRepository.findAllById(Set.of())).thenReturn(List.of());

        assertThatThrownBy(() -> service.resolve(1L, 7L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("当前用户不是该宗族成员");
    }

    private ClanMembershipEntity membership(Long id, Long clanId, Long userId) {
        ClanMembershipEntity entity = new ClanMembershipEntity();
        entity.setId(id);
        entity.setClanId(clanId);
        entity.setUserId(userId);
        entity.setMemberStatus(MemberStatus.active);
        return entity;
    }

    private MemberRoleEntity roleGrant(Long id, Long membershipId, Long roleId, MemberRoleScopeType scopeType, Long scopeId) {
        MemberRoleEntity entity = new MemberRoleEntity();
        entity.setId(id);
        entity.setMembershipId(membershipId);
        entity.setRoleId(roleId);
        entity.setScopeType(scopeType);
        entity.setScopeId(scopeId);
        entity.setStatus("active");
        return entity;
    }

    private RoleEntity role(Long id, String code) {
        RoleEntity entity = new RoleEntity();
        entity.setId(id);
        entity.setRoleCode(code);
        entity.setRoleName(code);
        return entity;
    }
}
