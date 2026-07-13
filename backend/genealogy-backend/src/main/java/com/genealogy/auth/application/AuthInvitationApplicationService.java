package com.genealogy.auth.application;

import com.genealogy.auth.config.AuthProperties;
import com.genealogy.auth.dto.AuthUserResponse;
import com.genealogy.auth.dto.CommercialAuthDtos.InvitationAcceptRequest;
import com.genealogy.auth.dto.CommercialAuthDtos.InvitationCreateRequest;
import com.genealogy.auth.dto.CommercialAuthDtos.InvitationCreateResponse;
import com.genealogy.auth.entity.AuthInvitationEntity;
import com.genealogy.auth.repository.AuthInvitationRepository;
import com.genealogy.auth.security.PasswordHashUtil;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.application.MemberPermissionApplicationService;
import com.genealogy.member.domain.MemberGrantPolicyService;
import com.genealogy.member.dto.CreateMemberGrantRequest;
import com.genealogy.member.enums.MemberRoleScopeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class AuthInvitationApplicationService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String STATUS_ACTIVE = "active";
    private static final String STATUS_ACCEPTED = "accepted";

    private final AuthInvitationRepository invitationRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final MemberGrantPolicyService memberGrantPolicyService;
    private final MemberPermissionApplicationService memberPermissionApplicationService;
    private final AuthApplicationService authApplicationService;
    private final AuthSecurityService authSecurityService;
    private final AuthProperties properties;

    public AuthInvitationApplicationService(
            AuthInvitationRepository invitationRepository,
            AuthorizationApplicationService authorizationApplicationService,
            MemberGrantPolicyService memberGrantPolicyService,
            MemberPermissionApplicationService memberPermissionApplicationService,
            AuthApplicationService authApplicationService,
            AuthSecurityService authSecurityService,
            AuthProperties properties
    ) {
        this.invitationRepository = invitationRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.memberGrantPolicyService = memberGrantPolicyService;
        this.memberPermissionApplicationService = memberPermissionApplicationService;
        this.authApplicationService = authApplicationService;
        this.authSecurityService = authSecurityService;
        this.properties = properties;
    }

    @Transactional
    public InvitationCreateResponse create(
            String authorization,
            InvitationCreateRequest request,
            String clientIp,
            String userAgent
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(request.clanId(), actorId, "member.invite");
        MemberRoleScopeType scopeType = parseScope(request.scopeType());
        memberGrantPolicyService.validateCreate(
                request.clanId(), actorId, request.roleCode(), scopeType, request.scopeId(), "创建账号邀请"
        );

        String token = generateToken();
        LocalDateTime now = LocalDateTime.now();
        AuthInvitationEntity invitation = new AuthInvitationEntity();
        invitation.setTokenHash(PasswordHashUtil.sha256(token));
        invitation.setClanId(request.clanId());
        invitation.setEmail(trimToNull(request.email()));
        invitation.setRoleCode(request.roleCode().trim());
        invitation.setScopeType(scopeType.name());
        invitation.setScopeId(request.scopeId());
        invitation.setInvitedBy(actorId);
        invitation.setStatus(STATUS_ACTIVE);
        invitation.setExpiresAt(now.plusHours(properties.getInviteHours()));
        invitation.setCreatedAt(now);
        AuthInvitationEntity saved = invitationRepository.save(invitation);

        authSecurityService.recordEvent(
                actorId, "account_invitation_created", "SUCCESS", "medium", clientIp, userAgent, null,
                "invitationId=" + saved.getId() + ",clanId=" + request.clanId() + ",role=" + request.roleCode()
        );
        return new InvitationCreateResponse(saved.getId(), token, saved.getExpiresAt());
    }

    @Transactional
    public AuthUserResponse accept(InvitationAcceptRequest request, String clientIp, String userAgent) {
        AuthInvitationEntity invitation = invitationRepository.findForUpdateByTokenHash(
                        PasswordHashUtil.sha256(request.invitationToken().trim()))
                .orElseThrow(this::invalidInvitation);
        if (!STATUS_ACTIVE.equals(invitation.getStatus())
                || invitation.getAcceptedAt() != null
                || invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw invalidInvitation();
        }
        String expectedEmail = trimToNull(invitation.getEmail());
        String suppliedEmail = trimToNull(request.email());
        if (expectedEmail != null && (suppliedEmail == null || !expectedEmail.equalsIgnoreCase(suppliedEmail))) {
            throw invalidInvitation();
        }

        AuthUserResponse user = authApplicationService.registerApproved(request.toRegisterRequest());
        memberPermissionApplicationService.createGrant(
                invitation.getClanId(),
                invitation.getInvitedBy(),
                new CreateMemberGrantRequest(
                        user.id(), invitation.getRoleCode(), invitation.getScopeType(), invitation.getScopeId(),
                        "接受账号邀请并加入宗族"
                )
        );

        invitation.setStatus(STATUS_ACCEPTED);
        invitation.setAcceptedAt(LocalDateTime.now());
        invitation.setAcceptedUserId(user.id());
        invitationRepository.save(invitation);
        // The user is still uncommitted in the surrounding transaction. Keep the
        // independent security event free of a foreign key to that row and carry
        // the identifier in the non-sensitive detail instead.
        authSecurityService.recordEvent(
                null, "account_invitation_accepted", "SUCCESS", "low", clientIp, userAgent, null,
                "invitationId=" + invitation.getId() + ",clanId=" + invitation.getClanId()
                        + ",acceptedUserId=" + user.id()
        );
        return user;
    }

    private MemberRoleScopeType parseScope(String value) {
        try {
            MemberRoleScopeType scopeType = MemberRoleScopeType.valueOf(value.trim().toLowerCase());
            if (scopeType == MemberRoleScopeType.clan || scopeType == MemberRoleScopeType.branch_subtree) {
                return scopeType;
            }
        } catch (RuntimeException ignored) {
            // Normalized business error below.
        }
        throw new BusinessException("AUTH_INVITATION_SCOPE_INVALID", "邀请授权范围不合法");
    }

    private BusinessException invalidInvitation() {
        return new BusinessException("AUTH_INVITATION_INVALID", "邀请凭据无效、已使用或已过期");
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
