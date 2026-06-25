package com.genealogy.generation.dto;

public record GenItemResponse(
        Long id,
        Integer generationNo,
        String word,
        String description,
        Integer sortOrder
) {
}
