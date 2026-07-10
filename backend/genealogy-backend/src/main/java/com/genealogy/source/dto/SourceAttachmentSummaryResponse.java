package com.genealogy.source.dto;

import java.time.LocalDateTime;

public record SourceAttachmentSummaryResponse(
        Long id,
        String fileName,
        String fileType,
        Long fileSize,
        String uploadStatus,
        boolean previewAllowed,
        boolean downloadAllowed,
        Long uploadedBy,
        LocalDateTime uploadedAt
) {
}
