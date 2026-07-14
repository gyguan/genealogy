package com.genealogy.culture.dto;

public record CultureCommandResponse(
        String targetType,
        Long targetId,
        String status,
        Long reviewTaskId,
        String message
) {}
