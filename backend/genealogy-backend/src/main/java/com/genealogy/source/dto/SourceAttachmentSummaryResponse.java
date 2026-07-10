package com.genealogy.source.dto;

import java.time.LocalDateTime;

public record SourceAttachmentSummaryResponse(
        Long id,
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

    public SourceAttachmentSummaryResponse(
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
        this(id, fileName, fileType, fileSize, "clan_only", "normal", uploadStatus, previewAllowed, downloadAllowed, uploadedBy, uploadedAt);
    }
}
