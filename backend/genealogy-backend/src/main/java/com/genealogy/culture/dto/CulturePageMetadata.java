package com.genealogy.culture.dto;

public record CulturePageMetadata(
        int pageNo,
        int pageSize,
        long totalElements,
        int totalPages
) {
}
