package com.genealogy.member.application;

import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.domain.MemberGrantPolicyService;
import com.genealogy.member.domain.MemberGrantPolicyService.ActorScope;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import com.genealogy.member.repository.RoleRepository;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.OperationLogRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MemberPermissionAuditApplicationServiceTest {

    private final OperationLogRepository operationLogRepository = mock(OperationLogRepository.class);
    private final ClanMembershipRepository clanMembershipRepository = mock(ClanMembershipRepository.class);
    private final MemberRoleRepository memberRoleRepository = mock(MemberRoleRepository.class);
    private final RoleRepository roleRepository = mock(RoleRepository.class);
    private final AppUserRepository appUserRepository = mock(AppUserRepository.class);
    private final MemberGrantPolicyService policyService = mock(MemberGrantPolicyService.class);
    private final MemberPermissionAuditApplicationService service = new MemberPermissionAuditApplicationService(
            operationLogRepository,
            clanMembershipRepository,
            memberRoleRepository,
            roleRepository,
            appUserRepository,
            policyService
    );

    @Test
    void branchScopeActorCannotRunUnboundedAuditQuery() {
        when(policyService.actorScope(1L, 9L))
                .thenReturn(new ActorScope(false, false, Set.of(10L), Set.of(10L)));

        assertThatThrownBy(() -> service.search(
                1L, 9L, null, null, null, null, null, null, 1, 20
        )).isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo("AUTH_FORBIDDEN");
    }

    @Test
    void visibleMemberAuditUsesDatabasePagination() {
        ActorScope scope = new ActorScope(false, false, Set.of(10L), Set.of(10L));
        ClanMembershipEntity membership = new ClanMembershipEntity();
        membership.setId(20L);
        membership.setClanId(1L);
        MemberRoleEntity grant = new MemberRoleEntity();
        grant.setId(30L);
        grant.setMembershipId(20L);
        grant.setScopeType(MemberRoleScopeType.branch_subtree);
        grant.setScopeId(10L);

        when(policyService.actorScope(1L, 9L)).thenReturn(scope);
        when(clanMembershipRepository.findById(20L)).thenReturn(Optional.of(membership));
        when(memberRoleRepository.findByMembershipIdIn(List.of(20L))).thenReturn(List.of(grant));
        when(policyService.canViewGrant(scope, MemberRoleScopeType.branch_subtree, 10L)).thenReturn(true);
        when(operationLogRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(Page.empty());

        var result = service.search(1L, 9L, 20L, null, null, null, null, null, 2, 25);

        assertThat(result.records()).isEmpty();
        assertThat(result.pageNo()).isEqualTo(2);
        assertThat(result.pageSize()).isEqualTo(25);
    }

    @Test
    void rejectsInvertedAuditTimeRangeBeforeQuerying() {
        LocalDateTime now = LocalDateTime.now();

        assertThatThrownBy(() -> service.search(
                1L, 9L, null, null, null, null, now, now.minusMinutes(1), 1, 20
        )).isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo("MEMBER_PERMISSION_AUDIT_TIME_INVALID");
    }
}
