package com.genealogy.branch.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.application.BranchApplicationService;
import com.genealogy.branch.dto.BranchCreateRequest;
import com.genealogy.branch.dto.BranchResponse;
import com.genealogy.branch.dto.BranchUpdateRequest;
import com.genealogy.common.api.ApiResponse;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class BranchController {

    private final BranchApplicationService branchApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public BranchController(BranchApplicationService branchApplicationService, AuthorizationApplicationService authorizationApplicationService) {
        this.branchApplicationService = branchApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @PostMapping("/clans/{clanId}/branches")
    public ApiResponse<BranchResponse> create(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody BranchCreateRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(branchApplicationService.create(clanId, request, actorId));
    }

    @GetMapping("/clans/{clanId}/branches")
    public ApiResponse<List<BranchResponse>> listByClan(
            @Positive @PathVariable Long clanId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(branchApplicationService.listByClan(clanId, actorId));
    }

    @GetMapping("/branches/{id}")
    public ApiResponse<BranchResponse> get(
            @Positive @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(branchApplicationService.get(id, actorId));
    }

    @PutMapping("/branches/{id}")
    public ApiResponse<BranchResponse> update(
            @Positive @PathVariable Long id,
            @Valid @RequestBody BranchUpdateRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(branchApplicationService.update(id, request, actorId));
    }

    @DeleteMapping("/branches/{id}")
    public ApiResponse<Void> delete(
            @Positive @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        branchApplicationService.delete(id, actorId);
        return ApiResponse.success();
    }
}
