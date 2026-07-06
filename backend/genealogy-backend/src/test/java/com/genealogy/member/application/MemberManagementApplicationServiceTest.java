package com.genealogy.member.application;

import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.member.dto.CreateClanMemberRequest;
import com.genealogy.member.dto.UpdateClanMemberRoleRequest;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import com.genealogy.member.repository.RoleRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MemberManagementApplicationServiceTest {

    private final AppUserRepository appUserRepository = mock(AppUserRepository.class);
    private final RoleRepository roleRepository = mock(RoleRepository.class);
    private final ClanMembershipRepository clanMembershipRepository = mock(ClanMembershipRepository.class);
    private final MemberRoleRepository memberRoleRepository = mock(MemberRoleRepository.class);
    private final BranchRepository branchRepository = mock(BranchRepository.class);
    private final OperationLogApplicationService operationLogApplicationService = mock(OperationLogApplicationService.class);
    private final MemberManagementApplicationService service = new MemberManagementApplicationService(
            appUserRepository,
            roleRepository,
            clanMembershipRepository,
            memberRoleRepository,
            branchRepository,
            operationLogApplicationService
    );

    @Test
    void createMemberRecordsPermissionChangeLog() {
        AppUserEntity user = user(2L);
        RoleEntity role = role(3L, "branch_admin");
        when(appUserRepository.findById(2L)).thenReturn(Optional.of(user));
        when(roleRepository.findByRoleCode("branch_admin")).thenReturn(Optional.of(role));
        when(clanMembershipRepository.findByClanIdAndUserId(1L, 2L)).thenReturn(Optional.empty());
        when(branchRepository.findByIdAndClanId(10L, 1L)).thenReturn(Optional.of(branch(1L, 10L)));
        when(memberRoleRepository.existsByMembershipIdAndRoleIdAndScopeTypeAndScopeIdAndStatus(88L, 3L, MemberRoleScopeType.branch, 10L, "active")).thenReturn(false);
        when(clanMembershipRepository.save(any(ClanMembershipEntity.class))).thenAnswer(invocation -> {
            ClanMembershipEntity entity = invocation.getArgument(0);
            entity.setId(88L);
            return entity;
        });
        when(memberRoleRepository.save(any(MemberRoleEntity.class))).thenAnswer(invocation -> {
            MemberRoleEntity entity = invocation.getArgument(0);
            entity.setId(99L);
            return entity;
        });

        service.createMember(1L, new CreateClanMemberRequest(2L, 10L, "branch_admin", "Member A", "branch_subtree", 10L), 100L);

        ArgumentCaptor<String> detailCaptor = ArgumentCaptor.forClass(String.class);
        verify(operationLogApplicationService).record(eq(1L), eq(100L), eq("member_invite"), eq("member_role"), eq(99L), any(), detailCaptor.capture());
        assertThat(detailCaptor.getValue()).contains("role=branch_admin").contains("scopeType=branch").contains("scopeId=10");
    }

    @Test
    void createMemberAllowsAnotherBranchGrantForSameUser() {
        AppUserEntity user = user(2L);
        RoleEntity role = role(4L, "editor");
        ClanMembershipEntity membership = membership(88L, 1L, 2L);
        when(appUserRepository.findById(2L)).thenReturn(Optional.of(user));
        when(roleRepository.findByRoleCode("editor")).thenReturn(Optional.of(role));
        when(clanMembershipRepository.findByClanIdAndUserId(1L, 2L)).thenReturn(Optional.of(membership));
        when(branchRepository.findByIdAndClanId(20L, 1L)).thenReturn(Optional.of(branch(1L, 20L)));
        when(memberRoleRepository.existsByMembershipIdAndRoleIdAndScopeTypeAndScopeIdAndStatus(88L, 4L, MemberRoleScopeType.branch, 20L, "active")).thenReturn(false);
        when(memberRoleRepository.save(any(MemberRoleEntity.class))).thenAnswer(invocation -> {
            MemberRoleEntity entity = invocation.getArgument(0);
            entity.setId(99L);
            return entity;
        });

        service.createMember(1L, new CreateClanMemberRequest(2L, 20L, "editor", "Member A", "branch", 20L), 100L);

        ArgumentCaptor<String> detailCaptor = ArgumentCaptor.forClass(String.class);
        verify(operationLogApplicationService).record(eq(1L), eq(100L), eq("member_invite"), eq("member_role"), eq(99L), any(), detailCaptor.capture());
        assertThat(detailCaptor.getValue()).contains("role=editor").contains("scopeType=branch").contains("scopeId=20");
    }

    @Test
    void updateMemberRecordsBeforeAndAfterPermissionSnapshot() {
        RoleEntity oldRole = role(6L, "viewer");
        RoleEntity newRole = role(4L, "editor");
        ClanMembershipEntity membership = membership(77L, 1L, 2L);
        MemberRoleEntity memberRole = memberRole(88L, membership.getId(), oldRole.getId(), MemberRoleScopeType.clan, 1L);
        when(memberRoleRepository.findById(88L)).thenReturn(Optional.of(memberRole));
        when(clanMembershipRepository.findById(membership.getId())).thenReturn(Optional.of(membership));
        when(roleRepository.findById(oldRole.getId())).thenReturn(Optional.of(oldRole));
        when(roleRepository.findByRoleCode("editor")).thenReturn(Optional.of(newRole));
        when(branchRepository.findByIdAndClanId(10L, 1L)).thenReturn(Optional.of(branch(1L, 10L)));
        when(appUserRepository.findById(2L)).thenReturn(Optional.of(user(2L)));
        when(memberRoleRepository.findByMembershipIdAndRoleIdAndScopeTypeAndScopeId(77L, 4L, MemberRoleScopeType.branch, 10L)).thenReturn(Optional.empty());
        when(clanMembershipRepository.save(any(ClanMembershipEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(memberRoleRepository.save(any(MemberRoleEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.updateMember(1L, 88L, new UpdateClanMemberRoleRequest("editor", "active", "branch_subtree", 10L, 10L), 100L);

        ArgumentCaptor<String> detailCaptor = ArgumentCaptor.forClass(String.class);
        verify(operationLogApplicationService).record(eq(1L), eq(100L), eq("member_update_role"), eq("member_role"), eq(88L), any(), detailCaptor.capture());
        assertThat(detailCaptor.getValue()).contains("before=role=viewer").contains("after=role=editor").contains("scopeType=branch");
    }

    private AppUserEntity user(Long id) {
        AppUserEntity user = new AppUserEntity();
        user.setId(id);
        user.setUsername("user" + id);
        user.setDisplayName("User " + id);
        user.setPasswordHash("hash");
        user.setStatus("active");
        return user;
    }

    private RoleEntity role(Long id, String code) {
        RoleEntity role = new RoleEntity();
        role.setId(id);
        role.setRoleCode(code);
        role.setRoleName(code);
        return role;
    }

    private BranchEntity branch(Long clanId, Long id) {
        BranchEntity branch = new BranchEntity();
        branch.setId(id);
        branch.setClanId(clanId);
        branch.setBranchName("branch" + id);
        branch.setBranchPath("/" + id);
        return branch;
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

    private MemberRoleEntity memberRole(Long id, Long membershipId, Long roleId, MemberRoleScopeType scopeType, Long scopeId) {
        MemberRoleEntity memberRole = new MemberRoleEntity();
        memberRole.setId(id);
        memberRole.setMembershipId(membershipId);
        memberRole.setRoleId(roleId);
        memberRole.setScopeType(scopeType);
        memberRole.setScopeId(scopeId);
        memberRole.setStatus("active");
        memberRole.setCreatedAt(LocalDateTime.now());
        return memberRole;
    }
}
