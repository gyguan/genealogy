package com.genealogy.source.dto;

import java.time.LocalDateTime;

public record AttachmentResponse(
        Long id,
        Long clanId,
        Long sourceId,
        String fileName,
        String fileType,
        Long fileSize,
        String storagePath,
        String thumbnailPath,
        String checksum,
        Long uploadedBy,
        LocalDateTime uploadedAt,
        String accessLevel
) {
}
