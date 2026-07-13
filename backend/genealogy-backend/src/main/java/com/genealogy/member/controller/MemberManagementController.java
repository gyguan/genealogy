package com.genealogy.member.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.PermissionApplicationService;
import com.genealogy.auth.dto.PermissionResponse;
import com.genealogy.auth.entity.AppPermissionEntity;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.member.application.MemberManagementApplicationService;
import com.genealogy.member.dto.MemberPermissionSummaryResponse;
import com.genealogy.member.dto.RoleResponse;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Legacy metadata endpoints retained for compatibility.
 *
 * <p>Member directory and member mutation endpoints were retired because they
 * exposed a second authorization path that did not enforce the target member's
 * branch scope. All member reads and writes must use
 * {@code /api/v1/clans/{clanId}/...} through {@link MemberPermissionController}.</p>
 */
@Validated
@RestController
@RequestMapping("/api/v1/member-management")
public class MemberManagementController {

    private static final String MEMBER_VIEW = "member.view";

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

    @GetMapping("/roles")
    public ApiResponse<List<RoleResponse>> roles(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(memberManagementApplicationService.roles());
    }

    @GetMapping("/permissions")
    public ApiResponse<List<PermissionResponse>> permissions(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(
                permissionApplicationService.listActivePermissions().stream()
                        .map(this::toPermissionResponse)
                        .toList()
        );
    }

    @GetMapping("/roles/{roleId}/permissions")
    public ApiResponse<List<PermissionResponse>> rolePermissions(
            @Positive @PathVariable Long roleId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(
                permissionApplicationService.activePermissionsForRoleId(roleId).stream()
                        .map(this::toPermissionResponse)
                        .toList()
        );
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
