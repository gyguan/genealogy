package com.genealogy.member.controller;

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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class MemberManagementController {

    private final MemberManagementApplicationService memberManagementApplicationService;

    public MemberManagementController(MemberManagementApplicationService memberManagementApplicationService) {
        this.memberManagementApplicationService = memberManagementApplicationService;
    }

    @GetMapping("/users")
    public ApiResponse<List<UserSummaryResponse>> users() {
        return ApiResponse.success(memberManagementApplicationService.users());
    }

    @GetMapping("/roles")
    public ApiResponse<List<RoleResponse>> roles() {
        return ApiResponse.success(memberManagementApplicationService.roles());
    }

    @GetMapping("/clans/{clanId}/members")
    public ApiResponse<List<ClanMemberResponse>> members(@Positive @PathVariable Long clanId) {
        return ApiResponse.success(memberManagementApplicationService.members(clanId));
    }

    @PostMapping("/clans/{clanId}/members")
    public ApiResponse<ClanMemberResponse> createMember(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody CreateClanMemberRequest request
    ) {
        return ApiResponse.success(memberManagementApplicationService.createMember(clanId, request));
    }

    @PutMapping("/clans/{clanId}/members/{memberId}")
    public ApiResponse<ClanMemberResponse> updateMember(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long memberId,
            @Valid @RequestBody UpdateClanMemberRoleRequest request
    ) {
        return ApiResponse.success(memberManagementApplicationService.updateMember(clanId, memberId, request));
    }
}
