package com.genealogy.review.dto;

public record ReviewTaskDetailResponse(
        CheckTaskResponse task,
        AuditRecordResponse auditRecord
) {
}
