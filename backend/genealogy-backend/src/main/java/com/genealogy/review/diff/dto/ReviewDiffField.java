package com.genealogy.review.diff.dto;

public record ReviewDiffField(
        String fieldName,
        String beforeValue,
        String afterValue,
        String changeType
) {
}
