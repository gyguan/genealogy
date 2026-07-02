package com.genealogy.member.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.member.application.MemberManagementApplicationService;
import com.genealogy.member.dto.ClanMemberResponse;
import com.genealogy.member.dto.CreateClanMemberRequest;
import com.genealogy.member.dto.RoleResponse;
import com.genealogy.member.dto.UpdateClanMemberRoleRequest;
import com.genealogy.member.dto.UserSummaryResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/member-management")
public class MemberManagementController {

    private static final String MEMBER_INVITE = "member:invite";
    private static final String MEMBER_UPDATE_ROLE = "member:update_role";

    private final MemberManagementApplicationService memberManagementApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public MemberManagementController(
            MemberManagementApplicationService memberManagementApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.memberManagementApplicationService = memberManagementApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @GetMapping("/users")
    public ApiResponse<List<UserSummaryResponse>> users(@RequestHeader(value = "Authorization", required = false) String authorization) {
        authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(memberManagementApplicationService.users());
    }

    @GetMapping("/roles")
    public ApiResponse<List<RoleResponse>> roles(@RequestHeader(value = "Authorization", required = false) String authorization) {
        authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(memberManagementApplicationService.roles());
    }

    @GetMapping("/clans/{clanId}/members")
    public ApiResponse<List<ClanMemberResponse>> members(
            @Positive @PathVariable Long clanId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(clanId, userId, MEMBER_UPDATE_ROLE);
        return ApiResponse.success(memberManagementApplicationService.members(clanId));
    }

    @PostMapping("/clans/{clanId}/members")
    public ApiResponse<ClanMemberResponse> createMember(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody CreateClanMemberRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(clanId, userId, MEMBER_INVITE);
        return ApiResponse.success(memberManagementApplicationService.createMember(clanId, request));
    }

    @PutMapping("/clans/{clanId}/members/{memberId}")
    public ApiResponse<ClanMemberResponse> updateMember(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long memberId,
            @Valid @RequestBody UpdateClanMemberRoleRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(clanId, userId, MEMBER_UPDATE_ROLE);
        return ApiResponse.success(memberManagementApplicationService.updateMember(clanId, memberId, request));
    }
}
