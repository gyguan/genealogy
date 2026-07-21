package com.genealogy.member.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.member.domain.MemberGrantPolicyService;
import com.genealogy.member.dto.MemberCandidateResponse;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import com.genealogy.member.repository.RoleRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MemberPermissionApplicationServiceTest {

    private final AppUserRepository appUserRepository = mock(AppUserRepository.class);
    private final RoleRepository roleRepository = mock(RoleRepository.class);
    private final ClanMembershipRepository clanMembershipRepository = mock(ClanMembershipRepository.class);
    private final MemberRoleRepository memberRoleRepository = mock(MemberRoleRepository.class);
    private final BranchRepository branchRepository = mock(BranchRepository.class);
    private final MemberGrantPolicyService memberGrantPolicyService = mock(MemberGrantPolicyService.class);
    private final AuthorizationApplicationService authorizationApplicationService = mock(AuthorizationApplicationService.class);
    private final OperationLogApplicationService operationLogApplicationService = mock(OperationLogApplicationService.class);
    private final MemberPermissionApplicationService service = new MemberPermissionApplicationService(
            appUserRepository,
            roleRepository,
            clanMembershipRepository,
            memberRoleRepository,
            branchRepository,
            memberGrantPolicyService,
            authorizationApplicationService,
            operationLogApplicationService
    );

    @Test
    void candidatesReturnMaskedAccountWithoutSensitiveProfileFields() {
        AppUserEntity user = new AppUserEntity();
        user.setId(10L);
        user.setUsername("huanghaijing");
        user.setDisplayName("黄海静");
        user.setPhone("13800000000");
        user.setEmail("private@example.com");
        user.setPasswordHash("secret");
        user.setStatus("active");

        when(appUserRepository.searchActiveCandidates(eq("huang"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(user)));
        when(clanMembershipRepository.findByClanIdAndUserIdIn(1L, List.of(10L)))
                .thenReturn(List.of());

        MemberCandidateResponse candidate = service.candidates(1L, "huang", 1, 20).records().get(0);

        assertThat(candidate.userId()).isEqualTo(10L);
        assertThat(candidate.displayName()).isEqualTo("黄海静");
        assertThat(candidate.maskedAccount()).isEqualTo("hu***");
        assertThat(candidate.alreadyMember()).isFalse();
    }

    @Test
    void memberSearchExpandsCommaSeparatedFiltersIntoRepositoryCollections() {
        when(memberGrantPolicyService.actorScope(1L, 2L))
                .thenReturn(MemberGrantPolicyService.ActorScope.full(true, true));
        when(clanMembershipRepository.searchMembers(
                eq(1L),
                eq("huang"),
                eq(true),
                eq(List.of("viewer", "editor")),
                eq(true),
                eq(List.of(MemberRoleScopeType.clan, MemberRoleScopeType.branch_subtree)),
                eq(true),
                eq(List.of(MemberStatus.active, MemberStatus.disabled)),
                eq(true),
                eq(MemberRoleScopeType.branch),
                eq(MemberRoleScopeType.branch_subtree),
                eq(List.of(-1L)),
                eq(List.of(-1L)),
                any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of()));

        assertThat(service.members(
                1L,
                2L,
                "huang",
                "viewer,editor",
                "clan,branch_subtree",
                "active,disabled",
                1,
                20
        ).records()).isEmpty();
    }
}
