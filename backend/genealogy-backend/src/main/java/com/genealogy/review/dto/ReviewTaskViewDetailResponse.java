package com.genealogy.review.dto;

import java.util.List;

public record ReviewTaskViewDetailResponse(
        ReviewTaskListItemResponse task,
        List<ReviewTaskListItemResponse> history
) {
}
