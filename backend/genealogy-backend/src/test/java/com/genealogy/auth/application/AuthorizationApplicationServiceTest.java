package com.genealogy.auth.application;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.entity.ClanMemberEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMemberRepository;
import com.genealogy.member.repository.RoleRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthorizationApplicationServiceTest {

    private final AuthApplicationService authApplicationService = mock(AuthApplicationService.class);
    private final ClanMemberRepository clanMemberRepository = mock(ClanMemberRepository.class);
    private final RoleRepository roleRepository = mock(RoleRepository.class);
    private final BranchRepository branchRepository = mock(BranchRepository.class);
    private final AuthorizationApplicationService service = new AuthorizationApplicationService(
            authApplicationService, clanMemberRepository, roleRepository, branchRepository
    );

    @Test
    void viewerCannotInviteMember() {
        givenActiveMember(1L, 20L, 6L, AuthorizationApplicationService.ROLE_VIEWER, MemberScopeType.clan, 1L, null);

        assertThatThrownBy(() -> service.requirePermission(1L, 20L, "member:invite"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("权限");
    }

    @Test
    void reviewerCanApproveButCannotExport() {
        givenActiveMember(1L, 30L, 5L, AuthorizationApplicationService.ROLE_REVIEWER, MemberScopeType.clan, 1L, null);

        assertThat(service.can(1L, 30L, "review_task:approve")).isTrue();
        assertThat(service.can(1L, 30L, "export_task:download")).isFalse();
    }

    @Test
    void branchAdminCanUseSubtreeButCannotUseSiblingBranch() {
        givenActiveMember(1L, 40L, 3L, AuthorizationApplicationService.ROLE_BRANCH_ADMIN, MemberScopeType.branch_subtree, 10L, 10L);
        givenBranch(1L, 10L, "/10");
        givenBranch(1L, 11L, "/10/11");
        givenBranch(1L, 12L, "/12");

        service.requireBranchPermission(1L, 40L, 11L, "relationship:create");

        assertThatThrownBy(() -> service.requireBranchPermission(1L, 40L, 12L, "relationship:create"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("范围");
    }

    @Test
    void editorCanReadClanDataWithMultipleBranchMemberships() {
        ClanMemberEntity branchOneEditor = member(100L, 1L, 50L, 4L, MemberScopeType.branch, 10L, 10L);
        ClanMemberEntity branchTwoEditor = member(101L, 1L, 50L, 4L, MemberScopeType.branch, 20L, 20L);
        givenActiveMembers(50L, List.of(branchOneEditor, branchTwoEditor));
        givenRole(4L, AuthorizationApplicationService.ROLE_EDITOR);

        ClanMemberEntity member = service.requirePermission(1L, 50L, "source:view");

        assertThat(member.getUserId()).isEqualTo(50L);
        assertThat(member.getClanId()).isEqualTo(1L);
    }

    @Test
    void editorCanUseAnyAuthorizedBranchWhenMultipleBranchMembershipsExist() {
        ClanMemberEntity branchOneEditor = member(100L, 1L, 50L, 4L, MemberScopeType.branch, 10L, 10L);
        ClanMemberEntity branchTwoEditor = member(101L, 1L, 50L, 4L, MemberScopeType.branch, 20L, 20L);
        givenActiveMembers(50L, List.of(branchOneEditor, branchTwoEditor));
        givenRole(4L, AuthorizationApplicationService.ROLE_EDITOR);

        service.requireBranchPermission(1L, 50L, 20L, "person:update");

        assertThatThrownBy(() -> service.requireBranchPermission(1L, 50L, 30L, "person:update"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("范围");
    }

    private void givenActiveMember(Long clanId, Long userId, Long roleId, String roleCode, MemberScopeType scopeType, Long scopeId, Long branchId) {
        ClanMemberEntity member = member(userId, clanId, userId, roleId, scopeType, scopeId, branchId);
        givenActiveMembers(userId, List.of(member));
        givenRole(roleId, roleCode);
    }

    private ClanMemberEntity member(Long id, Long clanId, Long userId, Long roleId, MemberScopeType scopeType, Long scopeId, Long branchId) {
        ClanMemberEntity member = new ClanMemberEntity();
        member.setId(id);
        member.setClanId(clanId);
        member.setUserId(userId);
        member.setRoleId(roleId);
        member.setMemberName("user-" + userId);
        member.setMemberStatus(MemberStatus.active);
        member.setScopeType(scopeType);
        member.setScopeId(scopeId);
        member.setBranchId(branchId);
        member.setJoinedAt(LocalDateTime.now().plusSeconds(id));
        return member;
    }

    private void givenActiveMembers(Long userId, List<ClanMemberEntity> members) {
        when(clanMemberRepository.findByUserIdAndMemberStatus(userId, MemberStatus.active)).thenReturn(members);
    }

    private void givenRole(Long roleId, String roleCode) {
        RoleEntity role = new RoleEntity();
        role.setId(roleId);
        role.setRoleCode(roleCode);
        role.setRoleName(roleCode);
        when(roleRepository.findById(roleId)).thenReturn(Optional.of(role));
    }

    private void givenBranch(Long clanId, Long branchId, String path) {
        BranchEntity branch = new BranchEntity();
        branch.setId(branchId);
        branch.setClanId(clanId);
        branch.setBranchName("branch-" + branchId);
        branch.setBranchPath(path);
        when(branchRepository.findByIdAndClanId(branchId, clanId)).thenReturn(Optional.of(branch));
    }
}
