package com.genealogy.review.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.review.application.ApprovalApplicationService;
import com.genealogy.review.dto.AuditRecordResponse;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.dto.PersonSubmitReviewRequest;
import com.genealogy.review.dto.ReviewDecisionRequest;
import com.genealogy.review.dto.TargetSubmitRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class ApprovalController {

    private final ApprovalApplicationService approvalApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ApprovalController(ApprovalApplicationService approvalApplicationService, AuthorizationApplicationService authorizationApplicationService) {
        this.approvalApplicationService = approvalApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @PostMapping("/persons/{personId}/submit-review")
    public ApiResponse<CheckTaskResponse> submitPersonReview(
            @Positive @PathVariable Long personId,
            @Valid @RequestBody PersonSubmitReviewRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        request = new PersonSubmitReviewRequest(userId, request.diffSummary());
        return ApiResponse.success(approvalApplicationService.submitPerson(personId, request));
    }

    @PostMapping("/relationships/{relationshipId}/submit-review")
    public ApiResponse<CheckTaskResponse> submitRelationshipReview(
            @Positive @PathVariable Long relationshipId,
            @Valid @RequestBody TargetSubmitRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        request = new TargetSubmitRequest(userId, request.diffSummary());
        return ApiResponse.success(approvalApplicationService.submitRelationship(relationshipId, request));
    }

    @PostMapping("/sources/{sourceId}/submit-review")
    public ApiResponse<CheckTaskResponse> submitSourceReview(
            @Positive @PathVariable Long sourceId,
            @Valid @RequestBody TargetSubmitRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        request = new TargetSubmitRequest(userId, request.diffSummary());
        return ApiResponse.success(approvalApplicationService.submitSource(sourceId, request));
    }

    @PostMapping("/branches/{branchId}/submit-review")
    public ApiResponse<CheckTaskResponse> submitBranchReview(
            @Positive @PathVariable Long branchId,
            @Valid @RequestBody TargetSubmitRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        request = new TargetSubmitRequest(userId, request.diffSummary());
        return ApiResponse.success(approvalApplicationService.submitBranch(branchId, request));
    }

    @PostMapping("/generation-schemes/{schemeId}/submit-review")
    public ApiResponse<CheckTaskResponse> submitGenerationSchemeReview(
            @Positive @PathVariable Long schemeId,
            @Valid @RequestBody TargetSubmitRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        request = new TargetSubmitRequest(userId, request.diffSummary());
        return ApiResponse.success(approvalApplicationService.submitGenerationScheme(schemeId, request));
    }

    @GetMapping("/clans/{clanId}/review-tasks/pending")
    public ApiResponse<List<CheckTaskResponse>> listPending(@Positive @PathVariable Long clanId) {
        return ApiResponse.success(approvalApplicationService.listPending(clanId));
    }

    @GetMapping("/review-tasks/{taskId}")
    public ApiResponse<CheckTaskResponse> getTask(@Positive @PathVariable Long taskId) {
        return ApiResponse.success(approvalApplicationService.getTask(taskId));
    }

    @PostMapping("/review-tasks/{taskId}/approve")
    public ApiResponse<CheckTaskResponse> approve(
            @Positive @PathVariable Long taskId,
            @Valid @RequestBody ReviewDecisionRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        request = new ReviewDecisionRequest(userId, request.comment());
        return ApiResponse.success(approvalApplicationService.approve(taskId, request));
    }

    @PostMapping("/review-tasks/{taskId}/reject")
    public ApiResponse<CheckTaskResponse> reject(
            @Positive @PathVariable Long taskId,
            @Valid @RequestBody ReviewDecisionRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        request = new ReviewDecisionRequest(userId, request.comment());
        return ApiResponse.success(approvalApplicationService.reject(taskId, request));
    }

    @GetMapping("/persons/{personId}/review-records")
    public ApiResponse<List<AuditRecordResponse>> listPersonRecords(@Positive @PathVariable Long personId) {
        return ApiResponse.success(approvalApplicationService.listPersonRecords(personId));
    }
}
