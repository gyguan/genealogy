package com.genealogy.tree.dto;

public record TreeReviewSummary(
        String state,
        int pendingTaskCount,
        int rejectedTaskCount
) {
    public static TreeReviewSummary empty() {
        return new TreeReviewSummary("none", 0, 0);
    }
}
