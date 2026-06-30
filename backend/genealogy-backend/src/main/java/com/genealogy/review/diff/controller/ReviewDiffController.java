package com.genealogy.review.diff.controller;

import com.genealogy.common.api.ApiResponse;
import com.genealogy.review.diff.application.ReviewDiffApplicationService;
import com.genealogy.review.diff.dto.ReviewDiffResponse;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1")
public class ReviewDiffController {

    private final ReviewDiffApplicationService reviewDiffApplicationService;

    public ReviewDiffController(ReviewDiffApplicationService reviewDiffApplicationService) {
        this.reviewDiffApplicationService = reviewDiffApplicationService;
    }

    @GetMapping("/review-tasks/{reviewTaskId}/diff")
    public ApiResponse<ReviewDiffResponse> byReviewTask(@Positive @PathVariable Long reviewTaskId) {
        return ApiResponse.success(reviewDiffApplicationService.byReviewTask(reviewTaskId));
    }

    @GetMapping("/revisions/{revisionId}/diff")
    public ApiResponse<ReviewDiffResponse> byRevision(@Positive @PathVariable Long revisionId) {
        return ApiResponse.success(reviewDiffApplicationService.byRevision(revisionId));
    }
}
