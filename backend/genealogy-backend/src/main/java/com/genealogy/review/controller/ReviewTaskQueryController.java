package com.genealogy.review.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageResponse;
import com.genealogy.review.application.ReviewTaskQueryApplicationService;
import com.genealogy.review.dto.ReviewTaskListItemResponse;
import com.genealogy.review.dto.ReviewTaskViewDetailResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class ReviewTaskQueryController {

    private final ReviewTaskQueryApplicationService reviewTaskQueryApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ReviewTaskQueryController(
            ReviewTaskQueryApplicationService reviewTaskQueryApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.reviewTaskQueryApplicationService = reviewTaskQueryApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @GetMapping("/clans/{clanId}/review-tasks/search")
    public ApiResponse<PageResponse<ReviewTaskListItemResponse>> search(
            @Positive @PathVariable Long clanId,
            @RequestParam(defaultValue = "pending") String view,
            @RequestParam(defaultValue = "mine") String scope,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) Long targetId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime submittedFrom,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime submittedTo,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime processedFrom,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime processedTo,
            @RequestParam(defaultValue = "1") @Min(1) int pageNo,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int pageSize,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(reviewTaskQueryApplicationService.search(
                clanId,
                view,
                scope,
                targetType,
                targetId,
                status,
                branchId,
                submittedFrom,
                submittedTo,
                processedFrom,
                processedTo,
                pageNo,
                pageSize,
                actorId
        ));
    }

    @GetMapping("/clans/{clanId}/review-tasks/{taskId}/view")
    public ApiResponse<ReviewTaskViewDetailResponse> detail(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long taskId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(reviewTaskQueryApplicationService.detail(clanId, taskId, actorId));
    }

    @GetMapping("/clans/{clanId}/review-targets/{targetType}/{targetId}/history")
    public ApiResponse<List<ReviewTaskListItemResponse>> history(
            @Positive @PathVariable Long clanId,
            @PathVariable String targetType,
            @Positive @PathVariable Long targetId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(reviewTaskQueryApplicationService.history(
                clanId,
                targetType,
                targetId,
                actorId
        ));
    }
}
