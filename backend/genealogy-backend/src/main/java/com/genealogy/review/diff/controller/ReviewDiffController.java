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

    /**
     * Review-task diff is served by ApprovalController so login and review_task:view
     * authorization are enforced in one canonical route.
     */
    @GetMapping("/revisions/{revisionId}/diff")
    public ApiResponse<ReviewDiffResponse> byRevision(@Positive @PathVariable Long revisionId) {
        return ApiResponse.success(reviewDiffApplicationService.byRevision(revisionId));
    }
}
