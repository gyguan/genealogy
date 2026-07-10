package com.genealogy.source.dto;

public record SourcePermissionView(
        boolean canEdit,
        boolean canDelete,
        boolean canBind,
        boolean canSubmitReview,
        boolean canUploadAttachment,
        boolean canPreviewAttachment,
        boolean canDownloadAttachment
) {
}
