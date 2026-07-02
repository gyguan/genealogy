package com.genealogy.member.application;

import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.member.dto.CreateClanMemberRequest;
import com.genealogy.member.dto.UpdateClanMemberRoleRequest;
import com.genealogy.member.entity.ClanMemberEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMemberRepository;
import com.genealogy.member.repository.RoleRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.List;
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
    private final ClanMemberRepository clanMemberRepository = mock(ClanMemberRepository.class);
    private final BranchRepository branchRepository = mock(BranchRepository.class);
    private final OperationLogApplicationService operationLogApplicationService = mock(OperationLogApplicationService.class);
    private final MemberManagementApplicationService service = new MemberManagementApplicationService(
            appUserRepository, roleRepository, clanMemberRepository, branchRepository, operationLogApplicationService
    );

    @Test
    void createMemberRecordsPermissionChangeLog() {
        AppUserEntity user = user(2L);
        RoleEntity role = role(3L, "branch_admin");
        BranchEntity branch = branch(1L, 10L);
        when(appUserRepository.findById(2L)).thenReturn(Optional.of(user));
        when(roleRepository.findByRoleCode("branch_admin")).thenReturn(Optional.of(role));
        when(clanMemberRepository.findByClanIdAndUserIdAndMemberStatus(1L, 2L, MemberStatus.active)).thenReturn(List.of());
        when(branchRepository.findByIdAndClanId(10L, 1L)).thenReturn(Optional.of(branch));
        when(clanMemberRepository.save(any(ClanMemberEntity.class))).thenAnswer(invocation -> {
            ClanMemberEntity entity = invocation.getArgument(0);
            entity.setId(99L);
            return entity;
        });

        service.createMember(1L, new CreateClanMemberRequest(2L, 10L, "branch_admin", "Member A", "branch_subtree", 10L), 100L);

        ArgumentCaptor<String> detailCaptor = ArgumentCaptor.forClass(String.class);
        verify(operationLogApplicationService).record(eq(1L), eq(100L), eq("member_invite"), eq("member"), eq(99L), any(), detailCaptor.capture());
        assertThat(detailCaptor.getValue()).contains("role=branch_admin").contains("scopeType=branch_subtree").contains("scopeId=10");
    }

    @Test
    void createMemberAllowsAnotherBranchGrantForSameUser() {
        AppUserEntity user = user(2L);
        RoleEntity role = role(4L, "editor");
        ClanMemberEntity existing = member(88L, 1L, 2L, role.getId(), MemberScopeType.branch, 10L, 10L);
        when(appUserRepository.findById(2L)).thenReturn(Optional.of(user));
        when(roleRepository.findByRoleCode("editor")).thenReturn(Optional.of(role));
        when(clanMemberRepository.findByClanIdAndUserIdAndMemberStatus(1L, 2L, MemberStatus.active)).thenReturn(List.of(existing));
        when(branchRepository.findByIdAndClanId(10L, 1L)).thenReturn(Optional.of(branch(1L, 10L)));
        when(branchRepository.findByIdAndClanId(20L, 1L)).thenReturn(Optional.of(branch(1L, 20L)));
        when(clanMemberRepository.save(any(ClanMemberEntity.class))).thenAnswer(invocation -> {
            ClanMemberEntity entity = invocation.getArgument(0);
            entity.setId(99L);
            return entity;
        });

        service.createMember(1L, new CreateClanMemberRequest(2L, 20L, "editor", "Member A", "branch", 20L), 100L);

        ArgumentCaptor<String> detailCaptor = ArgumentCaptor.forClass(String.class);
        verify(operationLogApplicationService).record(eq(1L), eq(100L), eq("member_invite"), eq("member"), eq(99L), any(), detailCaptor.capture());
        assertThat(detailCaptor.getValue()).contains("role=editor").contains("scopeType=branch").contains("scopeId=20");
    }

    @Test
    void updateMemberRecordsBeforeAndAfterPermissionSnapshot() {
        RoleEntity oldRole = role(6L, "viewer");
        RoleEntity newRole = role(4L, "editor");
        BranchEntity branch = branch(1L, 10L);
        ClanMemberEntity member = member(88L, 1L, 2L, oldRole.getId(), MemberScopeType.clan, 1L, null);
        when(clanMemberRepository.findById(88L)).thenReturn(Optional.of(member));
        when(roleRepository.findById(oldRole.getId())).thenReturn(Optional.of(oldRole));
        when(roleRepository.findByRoleCode("editor")).thenReturn(Optional.of(newRole));
        when(branchRepository.findByIdAndClanId(10L, 1L)).thenReturn(Optional.of(branch));
        when(appUserRepository.findById(2L)).thenReturn(Optional.of(user(2L)));
        when(clanMemberRepository.save(any(ClanMemberEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.updateMember(1L, 88L, new UpdateClanMemberRoleRequest("editor", "active", "branch_subtree", 10L, 10L), 100L);

        ArgumentCaptor<String> detailCaptor = ArgumentCaptor.forClass(String.class);
        verify(operationLogApplicationService).record(eq(1L), eq(100L), eq("member_update_role"), eq("member"), eq(88L), any(), detailCaptor.capture());
        assertThat(detailCaptor.getValue()).contains("before=role=viewer").contains("after=role=editor").contains("scopeType=branch_subtree");
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

    private ClanMemberEntity member(Long id, Long clanId, Long userId, Long roleId, MemberScopeType scopeType, Long scopeId, Long branchId) {
        ClanMemberEntity member = new ClanMemberEntity();
        member.setId(id);
        member.setClanId(clanId);
        member.setUserId(userId);
        member.setRoleId(roleId);
        member.setMemberName("member" + userId);
        member.setMemberStatus(MemberStatus.active);
        member.setScopeType(scopeType);
        member.setScopeId(scopeId);
        member.setBranchId(branchId);
        member.setJoinedAt(LocalDateTime.now());
        return member;
    }
}
