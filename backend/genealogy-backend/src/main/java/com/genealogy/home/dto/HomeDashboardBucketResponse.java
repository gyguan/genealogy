package com.genealogy.home.dto;

public record HomeDashboardBucketResponse(
        String key,
        String label,
        long count
) {
}
