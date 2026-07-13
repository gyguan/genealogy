package com.genealogy.auth.application;

import com.genealogy.auth.config.AuthProperties;
import com.genealogy.auth.dto.AuthUserResponse;
import com.genealogy.auth.dto.CommercialAuthDtos.InvitationAcceptRequest;
import com.genealogy.auth.dto.CommercialAuthDtos.InvitationCreateRequest;
import com.genealogy.auth.entity.AuthInvitationEntity;
import com.genealogy.auth.repository.AuthInvitationRepository;
import com.genealogy.auth.security.PasswordHashUtil;
import com.genealogy.member.application.MemberPermissionApplicationService;
import com.genealogy.member.domain.MemberGrantPolicyService;
import com.genealogy.member.dto.CreateMemberGrantRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthInvitationApplicationServiceTest {

    @Test
    void storesOnlyInvitationHashAndReturnsRawTokenOnce() {
        Fixture fixture = new Fixture();
        when(fixture.authorization.requireLogin("Bearer actor")).thenReturn(5L);
        when(fixture.repository.save(any(AuthInvitationEntity.class))).thenAnswer(invocation -> {
            AuthInvitationEntity entity = invocation.getArgument(0);
            entity.setId(99L);
            return entity;
        });

        var response = fixture.service.create(
                "Bearer actor",
                new InvitationCreateRequest(10L, "member@example.com", "editor", "clan", 10L),
                "10.0.0.1",
                "agent"
        );

        assertNotNull(response.invitationToken());
        ArgumentCaptor<AuthInvitationEntity> captor = ArgumentCaptor.forClass(AuthInvitationEntity.class);
        verify(fixture.repository).save(captor.capture());
        assertNotEquals(response.invitationToken(), captor.getValue().getTokenHash());
        assertEquals(PasswordHashUtil.sha256(response.invitationToken()), captor.getValue().getTokenHash());
        verify(fixture.authorization).requirePermission(10L, 5L, "member.invite");
    }

    @Test
    void acceptanceCreatesApprovedAccountAndGrantThenConsumesInvitation() {
        Fixture fixture = new Fixture();
        String rawToken = "invitation-token-value-1234567890";
        AuthInvitationEntity invitation = new AuthInvitationEntity();
        invitation.setId(99L);
        invitation.setTokenHash(PasswordHashUtil.sha256(rawToken));
        invitation.setClanId(10L);
        invitation.setEmail("member@example.com");
        invitation.setRoleCode("editor");
        invitation.setScopeType("clan");
        invitation.setScopeId(10L);
        invitation.setInvitedBy(5L);
        invitation.setStatus("active");
        invitation.setExpiresAt(LocalDateTime.now().plusHours(2));
        invitation.setCreatedAt(LocalDateTime.now());
        when(fixture.repository.findForUpdateByTokenHash(PasswordHashUtil.sha256(rawToken))).thenReturn(Optional.of(invitation));
        when(fixture.repository.save(any(AuthInvitationEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        AuthUserResponse user = new AuthUserResponse(
                7L, "newmember", null, "member@example.com", "新成员", null, "active",
                null, LocalDateTime.now()
        );
        when(fixture.authApplicationService.registerApproved(any())).thenReturn(user);

        AuthUserResponse response = fixture.service.accept(
                new InvitationAcceptRequest(rawToken, "newmember", "Password@123", "新成员", "member@example.com"),
                "10.0.0.2",
                "agent"
        );

        assertEquals(7L, response.id());
        assertEquals("accepted", invitation.getStatus());
        assertNotNull(invitation.getAcceptedAt());
        ArgumentCaptor<CreateMemberGrantRequest> requestCaptor = ArgumentCaptor.forClass(CreateMemberGrantRequest.class);
        verify(fixture.memberPermission).createGrant(org.mockito.ArgumentMatchers.eq(10L), org.mockito.ArgumentMatchers.eq(5L), requestCaptor.capture());
        assertEquals(7L, requestCaptor.getValue().userId());
        assertEquals("editor", requestCaptor.getValue().roleCode());
    }

    private static final class Fixture {
        private final AuthInvitationRepository repository = mock(AuthInvitationRepository.class);
        private final AuthorizationApplicationService authorization = mock(AuthorizationApplicationService.class);
        private final MemberGrantPolicyService policy = mock(MemberGrantPolicyService.class);
        private final MemberPermissionApplicationService memberPermission = mock(MemberPermissionApplicationService.class);
        private final AuthApplicationService authApplicationService = mock(AuthApplicationService.class);
        private final AuthSecurityService security = mock(AuthSecurityService.class);
        private final AuthInvitationApplicationService service = new AuthInvitationApplicationService(
                repository,
                authorization,
                policy,
                memberPermission,
                authApplicationService,
                security,
                new AuthProperties()
        );
    }
}
