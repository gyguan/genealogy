package com.genealogy.access.application;

import com.genealogy.access.domain.AccessAction;
import com.genealogy.access.domain.AccessDecision;
import com.genealogy.access.domain.DataScope;
import com.genealogy.access.domain.PrivacyDisclosure;
import com.genealogy.access.domain.ResourceContext;
import com.genealogy.auth.application.AuthorizationApplicationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UnifiedAccessDecisionServiceTest {

    private AuthorizationApplicationService authorization;
    private UnifiedAccessDecisionService service;

    @BeforeEach
    void setUp() {
        authorization = mock(AuthorizationApplicationService.class);
        service = new UnifiedAccessDecisionService(authorization);
    }

    @Test
    void anonymousRequestUsesStableNonDisclosingReason() {
        AccessDecision decision = service.decidePerson(null, person(true, true), AccessAction.VIEW);

        assertThat(decision.allowed()).isFalse();
        assertThat(decision.reasonCode()).isEqualTo("ACCESS_AUTHENTICATION_REQUIRED");
        assertThat(decision.dataScope().type()).isEqualTo(DataScope.Type.NONE);
        assertThat(decision.disclosure()).isEqualTo(PrivacyDisclosure.NONE);
    }

    @Test
    void revokedMemberIsRejectedBeforePermissionLookup() {
        when(authorization.isCrossClanAdmin(8L)).thenReturn(false);
        when(authorization.isActiveClanMember(10L, 8L)).thenReturn(false);

        AccessDecision decision = service.decideTree(8L, tree(), AccessAction.VIEW);

        assertThat(decision.allowed()).isFalse();
        assertThat(decision.reasonCode()).isEqualTo("ACCESS_SCOPE_FORBIDDEN");
    }

    @Test
    void branchMemberGetsRepositoryBranchScopeAndMaskedLivingContact() {
        when(authorization.isCrossClanAdmin(8L)).thenReturn(false);
        when(authorization.isActiveClanMember(10L, 8L)).thenReturn(true);
        when(authorization.can(10L, 8L, "person:view")).thenReturn(true);

        AccessDecision decision = service.decidePerson(8L, person(true, true), AccessAction.VIEW);

        assertThat(decision.allowed()).isTrue();
        assertThat(decision.dataScope().type()).isEqualTo(DataScope.Type.BRANCH);
        assertThat(decision.dataScope().branchId()).isEqualTo(20L);
        assertThat(decision.disclosure()).isEqualTo(PrivacyDisclosure.MASKED);
    }

    @Test
    void managerMayReceiveFullSensitiveDisclosure() {
        when(authorization.isCrossClanAdmin(8L)).thenReturn(false);
        when(authorization.isActiveClanMember(10L, 8L)).thenReturn(true);
        when(authorization.can(10L, 8L, "source:manage")).thenReturn(true);

        ResourceContext source = new ResourceContext(ResourceContext.Type.SOURCE, 30L, 10L, null, null, false, false, true);
        AccessDecision decision = service.decideSource(8L, source, AccessAction.MANAGE);

        assertThat(decision.allowed()).isTrue();
        assertThat(decision.dataScope().type()).isEqualTo(DataScope.Type.CLAN);
        assertThat(decision.disclosure()).isEqualTo(PrivacyDisclosure.FULL);
    }

    @Test
    void crossClanAdministratorReceivesExplicitGlobalScope() {
        when(authorization.isCrossClanAdmin(8L)).thenReturn(true);
        when(authorization.isActiveClanMember(10L, 8L)).thenReturn(true);
        when(authorization.can(10L, 8L, "member:view")).thenReturn(true);

        ResourceContext member = new ResourceContext(ResourceContext.Type.MEMBER, 40L, 10L, null, null, false, true, false);
        AccessDecision decision = service.decideMember(8L, member, AccessAction.LIST);

        assertThat(decision.allowed()).isTrue();
        assertThat(decision.dataScope().type()).isEqualTo(DataScope.Type.GLOBAL);
    }

    private ResourceContext person(boolean living, boolean contact) {
        return new ResourceContext(ResourceContext.Type.PERSON, 1L, 10L, 20L, null, living, contact, false);
    }

    private ResourceContext tree() {
        return new ResourceContext(ResourceContext.Type.TREE, 1L, 10L, 20L, null, false, false, false);
    }
}
