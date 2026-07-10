package com.genealogy.member.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.PermissionApplicationService;
import com.genealogy.auth.dto.PermissionResponse;
import com.genealogy.auth.entity.AppPermissionEntity;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageResponse;
import com.genealogy.member.application.MemberManagementApplicationService;
import com.genealogy.member.dto.ClanMemberResponse;
import com.genealogy.member.dto.CreateClanMemberRequest;
import com.genealogy.member.dto.MemberPermissionSummaryResponse;
import com.genealogy.member.dto.RoleResponse;
import com.genealogy.member.dto.UpdateClanMemberRoleRequest;
import com.genealogy.member.dto.UserSummaryResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
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
@RequestMapping("/api/v1/member-management")
public class MemberManagementController {

    private static final String MEMBER_VIEW = "member.view";
    private static final String MEMBER_INVITE = "member.invite";
    private static final String MEMBER_GRANT_ROLE = "member.grant_role";
    private static final String MEMBER_REVOKE_ROLE = "member.revoke_role";

    private final MemberManagementApplicationService memberManagementApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final PermissionApplicationService permissionApplicationService;

    public MemberManagementController(
            MemberManagementApplicationService memberManagementApplicationService,
            AuthorizationApplicationService authorizationApplicationService,
            PermissionApplicationService permissionApplicationService
    ) {
        this.memberManagementApplicationService = memberManagementApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
        this.permissionApplicationService = permissionApplicationService;
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

    @GetMapping("/permissions")
    public ApiResponse<List<PermissionResponse>> permissions(@RequestHeader(value = "Authorization", required = false) String authorization) {
        authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(permissionApplicationService.listActivePermissions().stream().map(this::toPermissionResponse).toList());
    }

    @GetMapping("/roles/{roleId}/permissions")
    public ApiResponse<List<PermissionResponse>> rolePermissions(
            @Positive @PathVariable Long roleId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(permissionApplicationService.activePermissionsForRoleId(roleId).stream().map(this::toPermissionResponse).toList());
    }

    @GetMapping("/clans/{clanId}/members/summary")
    public ApiResponse<MemberPermissionSummaryResponse> summary(
            @Positive @PathVariable Long clanId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(clanId, userId, MEMBER_VIEW);
        return ApiResponse.success(memberManagementApplicationService.summary(clanId));
    }

    @GetMapping("/clans/{clanId}/members")
    public ApiResponse<PageResponse<ClanMemberResponse>> members(
            @Positive @PathVariable Long clanId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String roleCode,
            @RequestParam(required = false) String scopeType,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(clanId, userId, MEMBER_VIEW);
        return ApiResponse.success(memberManagementApplicationService.members(clanId, keyword, roleCode, scopeType, status, pageNo, pageSize));
    }

    @PostMapping("/clans/{clanId}/members")
    public ApiResponse<ClanMemberResponse> createMember(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody CreateClanMemberRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(clanId, userId, MEMBER_INVITE);
        return ApiResponse.success(memberManagementApplicationService.createMember(clanId, request, userId));
    }

    @PutMapping("/clans/{clanId}/members/{memberId}")
    public ApiResponse<ClanMemberResponse> updateMember(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long memberId,
            @Valid @RequestBody UpdateClanMemberRoleRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(clanId, userId, MEMBER_GRANT_ROLE);
        return ApiResponse.success(memberManagementApplicationService.updateMember(clanId, memberId, request, userId));
    }

    @DeleteMapping("/clans/{clanId}/members/{memberId}")
    public ApiResponse<Void> revokeMemberRole(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long memberId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(clanId, userId, MEMBER_REVOKE_ROLE);
        memberManagementApplicationService.revokeMemberRole(clanId, memberId, userId);
        return ApiResponse.success();
    }

    private PermissionResponse toPermissionResponse(AppPermissionEntity entity) {
        return new PermissionResponse(
                entity.getId(),
                entity.getPermissionCode(),
                entity.getPermissionName(),
                entity.getModuleCode(),
                entity.getModuleName(),
                entity.getResourceCode(),
                entity.getActionCode(),
                entity.getDescription(),
                entity.getStatus()
        );
    }
}
