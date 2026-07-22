package com.genealogy.review.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.review.application.ApprovalApplicationService;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.dto.TargetSubmitRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/clans")
public class ClanReviewController {

    private final ApprovalApplicationService approvalApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ClanReviewController(
            ApprovalApplicationService approvalApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.approvalApplicationService = approvalApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @PostMapping("/{clanId}/submit-review")
    public ApiResponse<CheckTaskResponse> submitReview(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody TargetSubmitRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        TargetSubmitRequest authenticatedRequest = new TargetSubmitRequest(userId, request.diffSummary());
        return ApiResponse.success(approvalApplicationService.submitClan(clanId, authenticatedRequest));
    }
}
