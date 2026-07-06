package com.genealogy.review.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.review.application.ReviewApplicationService;
import com.genealogy.review.dto.ReviewDecisionRequest;
import com.genealogy.review.dto.ReviewDiffResponse;
import com.genealogy.review.dto.ReviewSubmitRequest;
import com.genealogy.review.dto.ReviewTaskResponse;
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
public class ReviewController {

    private final ReviewApplicationService reviewApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ReviewController(
            ReviewApplicationService reviewApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.reviewApplicationService = reviewApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @PostMapping("/clans/{clanId}/review-tasks")
    public ApiResponse<ReviewTaskResponse> submit(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody ReviewSubmitRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(reviewApplicationService.submit(clanId, request, actorId));
    }

    @PostMapping("/persons/{personId}/submit-review")
    public ApiResponse<ReviewTaskResponse> submitPerson(
            @Positive @PathVariable Long personId,
            @RequestBody(required = false) ReviewDecisionRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        ReviewSubmitRequest submitRequest = new ReviewSubmitRequest("person", personId, "modified", request == null ? null : request.comment());
        return ApiResponse.success(reviewApplicationService.submit(resolveClanIdFromPerson(personId), submitRequest, actorId));
    }

    @GetMapping("/clans/{clanId}/review-tasks/pending")
    public ApiResponse<List<ReviewTaskResponse>> pending(
            @Positive @PathVariable Long clanId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(reviewApplicationService.pending(clanId, actorId));
    }

    @GetMapping("/review-tasks/{id}/diff")
    public ApiResponse<ReviewDiffResponse> diff(
            @Positive @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(reviewApplicationService.diff(id, actorId));
    }

    @PostMapping("/review-tasks/{id}/approve")
    public ApiResponse<ReviewTaskResponse> approve(
            @Positive @PathVariable Long id,
            @RequestBody(required = false) ReviewDecisionRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(reviewApplicationService.approve(id, request, actorId));
    }

    @PostMapping("/review-tasks/{id}/reject")
    public ApiResponse<ReviewTaskResponse> reject(
            @Positive @PathVariable Long id,
            @RequestBody(required = false) ReviewDecisionRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(reviewApplicationService.reject(id, request, actorId));
    }

    private Long resolveClanIdFromPerson(Long personId) {
        return reviewApplicationService.diff(-1L, -1L).clanId();
    }
}
