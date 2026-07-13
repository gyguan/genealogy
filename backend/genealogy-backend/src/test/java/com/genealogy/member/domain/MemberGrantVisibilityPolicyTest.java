package com.genealogy.member.domain;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.member.domain.MemberGrantPolicyService.ActorScope;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import com.genealogy.member.repository.RoleRepository;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class MemberGrantVisibilityPolicyTest {

    private final MemberGrantPolicyService service = new MemberGrantPolicyService(
            mock(AuthorizationApplicationService.class),
            mock(ClanMembershipRepository.class),
            mock(MemberRoleRepository.class),
            mock(RoleRepository.class),
            mock(BranchRepository.class)
    );

    @Test
    void branchActorOnlySeesExactOrSubtreeGrantsWithinOwnScope() {
        ActorScope scope = new ActorScope(false, false, Set.of(10L, 11L), Set.of(10L, 11L));

        assertThat(service.canViewGrant(scope, MemberRoleScopeType.branch, 11L)).isTrue();
        assertThat(service.canViewGrant(scope, MemberRoleScopeType.branch_subtree, 10L)).isTrue();
        assertThat(service.canViewGrant(scope, MemberRoleScopeType.branch, 20L)).isFalse();
        assertThat(service.canViewGrant(scope, MemberRoleScopeType.clan, 1L)).isFalse();
    }

    @Test
    void clanAdministratorCanSeeAllGrantScopes() {
        ActorScope scope = ActorScope.full(false, true);

        assertThat(service.canViewGrant(scope, MemberRoleScopeType.clan, 1L)).isTrue();
        assertThat(service.canViewGrant(scope, MemberRoleScopeType.branch_subtree, 99L)).isTrue();
    }
}
