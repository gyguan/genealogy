package com.genealogy.member.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageResponse;
import com.genealogy.member.application.MemberPermissionApplicationService;
import com.genealogy.member.dto.CreateMemberGrantRequest;
import com.genealogy.member.dto.GrantableRoleResponse;
import com.genealogy.member.dto.MemberAggregateResponse;
import com.genealogy.member.dto.MemberCandidateResponse;
import com.genealogy.member.dto.MemberGrantResponse;
import com.genealogy.member.dto.RevokeMemberGrantRequest;
import com.genealogy.member.dto.UpdateMemberGrantRequest;
import com.genealogy.member.dto.UpdateMemberStatusRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/clans/{clanId}")
public class MemberPermissionController {

    private static final String MEMBER_VIEW = "member.view";
    private static final String MEMBER_INVITE = "member.invite";
    private static final String MEMBER_GRANT_ROLE = "member.grant_role";
    private static final String MEMBER_REVOKE_ROLE = "member.revoke_role";
    private static final String MEMBER_DISABLE = "member.disable";

    private final MemberPermissionApplicationService memberPermissionApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public MemberPermissionController(
            MemberPermissionApplicationService memberPermissionApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.memberPermissionApplicationService = memberPermissionApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @GetMapping("/members")
    public ApiResponse<PageResponse<MemberAggregateResponse>> members(
            @Positive @PathVariable Long clanId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String roleCode,
            @RequestParam(required = false) String scopeType,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(clanId, actorId, MEMBER_VIEW);
        return ApiResponse.success(memberPermissionApplicationService.members(
                clanId, actorId, keyword, roleCode, scopeType, status, pageNo, pageSize
        ));
    }

    @GetMapping("/member-candidates")
    public ApiResponse<PageResponse<MemberCandidateResponse>> candidates(
            @Positive @PathVariable Long clanId,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(clanId, actorId, MEMBER_INVITE);
        return ApiResponse.success(memberPermissionApplicationService.candidates(clanId, keyword, pageNo, pageSize));
    }

    @GetMapping("/grantable-roles")
    public ApiResponse<List<GrantableRoleResponse>> grantableRoles(
            @Positive @PathVariable Long clanId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(clanId, actorId, MEMBER_GRANT_ROLE);
        return ApiResponse.success(memberPermissionApplicationService.grantableRoles(clanId, actorId));
    }

    @PostMapping("/member-grants")
    public ApiResponse<MemberGrantResponse> createGrant(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody CreateMemberGrantRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(clanId, actorId, MEMBER_INVITE);
        return ApiResponse.success(memberPermissionApplicationService.createGrant(clanId, actorId, request));
    }

    @PutMapping("/member-grants/{grantId}")
    public ApiResponse<MemberGrantResponse> updateGrant(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long grantId,
            @Valid @RequestBody UpdateMemberGrantRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(clanId, actorId, MEMBER_GRANT_ROLE);
        return ApiResponse.success(memberPermissionApplicationService.updateGrant(clanId, actorId, grantId, request));
    }

    @PostMapping("/member-grants/{grantId}/revoke")
    public ApiResponse<Void> revokeGrant(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long grantId,
            @Valid @RequestBody RevokeMemberGrantRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(clanId, actorId, MEMBER_REVOKE_ROLE);
        memberPermissionApplicationService.revokeGrant(clanId, actorId, grantId, request.reason());
        return ApiResponse.success();
    }

    @PatchMapping("/members/{membershipId}/status")
    public ApiResponse<MemberAggregateResponse> updateMemberStatus(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long membershipId,
            @Valid @RequestBody UpdateMemberStatusRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(clanId, actorId, MEMBER_DISABLE);
        return ApiResponse.success(memberPermissionApplicationService.updateMemberStatus(
                clanId, actorId, membershipId, request
        ));
    }
}
