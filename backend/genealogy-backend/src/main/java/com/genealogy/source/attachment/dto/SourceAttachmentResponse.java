package com.genealogy.source.attachment.dto;

import java.time.LocalDateTime;

public record SourceAttachmentResponse(
        Long id,
        Long sourceId,
        Long clanId,
        String originalFilename,
        String storedFilename,
        String contentType,
        Long fileSize,
        String storagePath,
        String checksum,
        String uploadStatus,
        LocalDateTime createdAt
) {
}
