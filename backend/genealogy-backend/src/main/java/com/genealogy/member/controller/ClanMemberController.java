package com.genealogy.member.controller;

import com.genealogy.common.api.ApiResponse;
import com.genealogy.member.application.MemberApplicationService;
import com.genealogy.member.dto.MemberCreateRequest;
import com.genealogy.member.dto.MemberResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class ClanMemberController {

    private final MemberApplicationService memberApplicationService;

    public ClanMemberController(MemberApplicationService memberApplicationService) {
        this.memberApplicationService = memberApplicationService;
    }

    @PostMapping("/clans/{clanId}/members")
    public ApiResponse<MemberResponse> create(@Positive @PathVariable Long clanId, @Valid @RequestBody MemberCreateRequest request) {
        return ApiResponse.success(memberApplicationService.create(clanId, request));
    }

    @GetMapping("/clans/{clanId}/members")
    public ApiResponse<List<MemberResponse>> listActiveByClan(@Positive @PathVariable Long clanId) {
        return ApiResponse.success(memberApplicationService.listActiveByClan(clanId));
    }
}
