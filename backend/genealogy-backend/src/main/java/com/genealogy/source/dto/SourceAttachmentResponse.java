package com.genealogy.source.dto;

import java.time.LocalDateTime;

public record SourceAttachmentResponse(
        Long id,
        Long sourceId,
        Long clanId,
        String fileName,
        String fileType,
        Long fileSize,
        String privacyLevel,
        String sensitiveLevel,
        String uploadStatus,
        boolean previewAllowed,
        boolean downloadAllowed,
        Long uploadedBy,
        LocalDateTime uploadedAt
) {
}
