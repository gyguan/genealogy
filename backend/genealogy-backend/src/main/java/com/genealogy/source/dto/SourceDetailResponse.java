package com.genealogy.source.dto;

import java.util.List;

public record SourceDetailResponse(
        SourceResponse source,
        SourcePermissionView permissions,
        List<SourceBindingSummaryResponse> bindingSummaries,
        List<SourceAttachmentSummaryResponse> attachmentSummaries
) {
}
