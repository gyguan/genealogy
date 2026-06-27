package com.genealogy.source.dto;

public record AttachmentFileDownload(
        String fileName,
        String fileType,
        byte[] content
) {
}
