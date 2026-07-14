package com.genealogy.culture.dto;

public record CultureAttachmentSummaryResponse(
        Long attachmentId,
        String fileName,
        String contentType,
        Long fileSize,
        boolean canPreview,
        boolean canDownload
) {
}
