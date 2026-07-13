package com.genealogy.auth.application;

import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import com.genealogy.member.repository.RoleRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthorizationApplicationServiceTest {

    private final AuthApplicationService authApplicationService = mock(AuthApplicationService.class);
    private final ClanMembershipRepository clanMembershipRepository = mock(ClanMembershipRepository.class);
    private final MemberRoleRepository memberRoleRepository = mock(MemberRoleRepository.class);
    private final RoleRepository roleRepository = mock(RoleRepository.class);
    private final BranchRepository branchRepository = mock(BranchRepository.class);
    private final RbacAuthorizationApplicationService rbacAuthorizationApplicationService = mock(RbacAuthorizationApplicationService.class);
    private final PermissionApplicationService permissionApplicationService = mock(PermissionApplicationService.class);
    private final AuthorizationApplicationService service = new AuthorizationApplicationService(
            authApplicationService,
            clanMembershipRepository,
            memberRoleRepository,
            roleRepository,
            branchRepository,
            rbacAuthorizationApplicationService,
            permissionApplicationService
    );

    @Test
    void requireLoginRejectsAnonymousUser() {
        when(authApplicationService.currentUserIdOrNull(null)).thenReturn(null);

        assertThatThrownBy(() -> service.requireLogin(null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("请先登录");
    }

    @Test
    void requireClanMemberReturnsActiveMembership() {
        ClanMembershipEntity membership = membership(100L, 1L, 20L);
        givenUserHasNoCrossClanRole(20L, membership);
        when(clanMembershipRepository.findByClanIdAndUserIdAndMemberStatus(1L, 20L, MemberStatus.active)).thenReturn(Optional.of(membership));

        ClanMembershipEntity result = service.requireClanMember(1L, 20L);

        assertThat(result).isSameAs(membership);
    }

    @Test
    void requirePermissionReturnsActiveMembershipWhenRbacAllows() {
        ClanMembershipEntity membership = membership(100L, 1L, 30L);
        givenUserHasNoCrossClanRole(30L, membership);
        when(rbacAuthorizationApplicationService.hasPermission(30L, 1L, "person:view")).thenReturn(true);
        when(clanMembershipRepository.findByClanIdAndUserIdAndMemberStatus(1L, 30L, MemberStatus.active)).thenReturn(Optional.of(membership));

        ClanMembershipEntity result = service.requirePermission(1L, 30L, "person:view");

        assertThat(result).isSameAs(membership);
    }

    @Test
    void canReturnsFalseWhenRbacDenies() {
        ClanMembershipEntity membership = membership(100L, 1L, 40L);
        givenUserHasNoCrossClanRole(40L, membership);
        when(rbacAuthorizationApplicationService.hasPermission(40L, 1L, "review_task:approve")).thenReturn(false);

        assertThat(service.can(1L, 40L, "review_task:approve")).isFalse();
    }

    @Test
    void requireDirectClanMemberDoesNotAllowCrossClanBypass() {
        when(clanMembershipRepository.findByClanIdAndUserIdAndMemberStatus(9L, 50L, MemberStatus.active))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.requireDirectClanMember(9L, 50L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("不是该宗族成员");

        verify(memberRoleRepository, never()).findByMembershipIdAndStatus(org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void requireDirectClanPermissionChecksMembershipBeforeRbac() {
        when(clanMembershipRepository.findByClanIdAndUserIdAndMemberStatus(9L, 60L, MemberStatus.active))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.requireDirectClanPermission(9L, 60L, "operation_log.view"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("不是该宗族成员");

        verify(rbacAuthorizationApplicationService, never())
                .requirePermission(60L, 9L, "operation_log.view");
    }

    @Test
    void requireDirectClanPermissionUsesTargetClanRbacGrant() {
        ClanMembershipEntity membership = membership(200L, 9L, 70L);
        when(clanMembershipRepository.findByClanIdAndUserIdAndMemberStatus(9L, 70L, MemberStatus.active))
                .thenReturn(Optional.of(membership));

        ClanMembershipEntity result = service.requireDirectClanPermission(9L, 70L, "operation_log.export");

        assertThat(result).isSameAs(membership);
        verify(rbacAuthorizationApplicationService)
                .requirePermission(70L, 9L, "operation_log.export");
    }

    @Test
    void hasDirectClanPermissionRequiresMembershipAndPermissionInSameClan() {
        when(rbacAuthorizationApplicationService.isActiveClanMember(80L, 9L)).thenReturn(true);
        when(rbacAuthorizationApplicationService.hasPermission(80L, 9L, "operation_log.export")).thenReturn(true);

        assertThat(service.hasDirectClanPermission(9L, 80L, "operation_log.export")).isTrue();
    }

    private void givenUserHasNoCrossClanRole(Long userId, ClanMembershipEntity membership) {
        when(clanMembershipRepository.findByUserIdAndMemberStatus(userId, MemberStatus.active)).thenReturn(List.of(membership));
        when(memberRoleRepository.findByMembershipIdAndStatus(membership.getId(), "active")).thenReturn(List.of());
    }

    private ClanMembershipEntity membership(Long id, Long clanId, Long userId) {
        ClanMembershipEntity membership = new ClanMembershipEntity();
        membership.setId(id);
        membership.setClanId(clanId);
        membership.setUserId(userId);
        membership.setJoinStatus("joined");
        membership.setMemberStatus(MemberStatus.active);
        membership.setJoinedAt(LocalDateTime.now());
        return membership;
    }
}
