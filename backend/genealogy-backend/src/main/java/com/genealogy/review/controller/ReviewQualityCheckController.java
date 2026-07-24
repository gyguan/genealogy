package com.genealogy.review.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.review.application.ReviewQualityCheckApplicationService;
import com.genealogy.review.dto.ReviewQualityCheckAcceptedResponse;
import com.genealogy.review.dto.ReviewQualityCheckResponse;
import com.genealogy.review.dto.ReviewQualityCheckTriggerRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/v1/clans/{clanId}")
public class ReviewQualityCheckController {

    private final ReviewQualityCheckApplicationService reviewQualityCheckApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ReviewQualityCheckController(
            ReviewQualityCheckApplicationService reviewQualityCheckApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.reviewQualityCheckApplicationService = reviewQualityCheckApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @PostMapping("/review-quality-checks")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<ReviewQualityCheckAcceptedResponse> trigger(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody ReviewQualityCheckTriggerRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(reviewQualityCheckApplicationService.trigger(clanId, request, actorId));
    }

    @GetMapping("/review-quality-checks/{checkId}")
    public ApiResponse<ReviewQualityCheckResponse> get(
            @Positive @PathVariable Long clanId,
            @PathVariable UUID checkId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(reviewQualityCheckApplicationService.get(clanId, checkId, actorId));
    }

    @GetMapping("/review-tasks/{reviewTaskId}/quality-check")
    public ApiResponse<ReviewQualityCheckResponse> latestForTask(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long reviewTaskId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(reviewQualityCheckApplicationService.latestForTask(clanId, reviewTaskId, actorId));
    }
}
