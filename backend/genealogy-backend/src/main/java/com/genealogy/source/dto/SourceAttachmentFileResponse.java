package com.genealogy.source.dto;

public record SourceAttachmentFileResponse(
        Long id,
        String fileName,
        String contentType,
        long fileSize,
        byte[] content
) {
}
