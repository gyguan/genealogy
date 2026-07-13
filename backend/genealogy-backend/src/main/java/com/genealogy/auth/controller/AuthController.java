package com.genealogy.auth.controller;

import com.genealogy.auth.application.AuthApplicationService;
import com.genealogy.auth.application.AuthApplicationService.AuthLoginResult;
import com.genealogy.auth.application.AuthInvitationApplicationService;
import com.genealogy.auth.application.PasswordResetApplicationService;
import com.genealogy.auth.dto.AuthUserResponse;
import com.genealogy.auth.dto.CommercialAuthDtos.AuthSessionResponse;
import com.genealogy.auth.dto.CommercialAuthDtos.ForgotPasswordRequest;
import com.genealogy.auth.dto.CommercialAuthDtos.ForgotPasswordResponse;
import com.genealogy.auth.dto.CommercialAuthDtos.InvitationAcceptRequest;
import com.genealogy.auth.dto.CommercialAuthDtos.InvitationCreateRequest;
import com.genealogy.auth.dto.CommercialAuthDtos.InvitationCreateResponse;
import com.genealogy.auth.dto.CommercialAuthDtos.ResetPasswordRequest;
import com.genealogy.auth.dto.LoginRequest;
import com.genealogy.auth.dto.LoginResponse;
import com.genealogy.auth.dto.RegisterRequest;
import com.genealogy.auth.security.AuthCookieService;
import com.genealogy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthApplicationService authApplicationService;
    private final AuthInvitationApplicationService invitationApplicationService;
    private final PasswordResetApplicationService passwordResetApplicationService;
    private final AuthCookieService authCookieService;

    public AuthController(
            AuthApplicationService authApplicationService,
            AuthInvitationApplicationService invitationApplicationService,
            PasswordResetApplicationService passwordResetApplicationService,
            AuthCookieService authCookieService
    ) {
        this.authApplicationService = authApplicationService;
        this.invitationApplicationService = invitationApplicationService;
        this.passwordResetApplicationService = passwordResetApplicationService;
        this.authCookieService = authCookieService;
    }

    @PostMapping("/register")
    public ApiResponse<AuthUserResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.success(authApplicationService.register(request));
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse
    ) {
        AuthLoginResult result = authApplicationService.loginSession(
                request, servletRequest.getRemoteAddr(), servletRequest.getHeader("User-Agent")
        );
        authCookieService.write(servletResponse, result);
        return ApiResponse.success(result.response());
    }

    @GetMapping("/me")
    public ApiResponse<AuthUserResponse> me(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return ApiResponse.success(authApplicationService.currentUser(authorization));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletResponse response
    ) {
        try {
            authApplicationService.logout(authorization);
        } finally {
            authCookieService.clear(response);
        }
        return ApiResponse.success();
    }

    @PostMapping("/session/refresh")
    public ApiResponse<LoginResponse> refresh(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        AuthLoginResult result = authApplicationService.refreshSession(
                authorization, request.getRemoteAddr(), request.getHeader("User-Agent")
        );
        authCookieService.write(response, result);
        return ApiResponse.success(result.response());
    }

    @GetMapping("/sessions")
    public ApiResponse<List<AuthSessionResponse>> sessions(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return ApiResponse.success(authApplicationService.sessions(authorization));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ApiResponse<Void> revokeSession(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long sessionId
    ) {
        authApplicationService.revokeSession(authorization, sessionId);
        return ApiResponse.success();
    }

    @PostMapping("/sessions/revoke-others")
    public ApiResponse<Void> revokeOtherSessions(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        authApplicationService.revokeOtherSessions(authorization);
        return ApiResponse.success();
    }

    @PostMapping("/invitations")
    public ApiResponse<InvitationCreateResponse> createInvitation(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody InvitationCreateRequest invitation,
            HttpServletRequest request
    ) {
        return ApiResponse.success(invitationApplicationService.create(
                authorization, invitation, request.getRemoteAddr(), request.getHeader("User-Agent")
        ));
    }

    @PostMapping("/invitations/accept")
    public ApiResponse<AuthUserResponse> acceptInvitation(
            @Valid @RequestBody InvitationAcceptRequest invitation,
            HttpServletRequest request
    ) {
        return ApiResponse.success(invitationApplicationService.accept(
                invitation, request.getRemoteAddr(), request.getHeader("User-Agent")
        ));
    }

    @PostMapping("/password/forgot")
    public ApiResponse<ForgotPasswordResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest forgotPassword,
            HttpServletRequest request
    ) {
        return ApiResponse.success(passwordResetApplicationService.request(
                forgotPassword, request.getRemoteAddr(), request.getHeader("User-Agent")
        ));
    }

    @PostMapping("/password/reset")
    public ApiResponse<Void> resetPassword(
            @Valid @RequestBody ResetPasswordRequest resetPassword,
            HttpServletRequest request
    ) {
        passwordResetApplicationService.reset(
                resetPassword, request.getRemoteAddr(), request.getHeader("User-Agent")
        );
        return ApiResponse.success();
    }
}
