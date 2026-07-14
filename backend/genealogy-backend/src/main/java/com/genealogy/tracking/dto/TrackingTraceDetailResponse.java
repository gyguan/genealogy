package com.genealogy.tracking.dto;

import com.genealogy.operationlog.dto.OperationLogResponse;

import java.time.LocalDateTime;
import java.util.List;

public record TrackingTraceDetailResponse(
        TrackingObjectResponse objectSummary,
        String currentStatus,
        List<TimelineEvent> timeline,
        List<RevisionItem> revisions,
        List<ReviewTaskItem> reviewTasks,
        List<SourceBindingItem> sourceBindings,
        List<OperationLogResponse> operationLogs,
        List<String> allowedActions,
        TraceCoverage traceCoverage
) {

    public record TimelineEvent(
            String eventKey,
            String eventType,
            String sourceType,
            Long sourceId,
            String title,
            String summary,
            LocalDateTime occurredAt,
            String actorDisplayName,
            String resultStatus
    ) {
    }

    public record RevisionItem(
            Long id,
            String changeType,
            String status,
            String diffSummary,
            String submitterDisplayName,
            LocalDateTime submitTime,
            LocalDateTime approvedAt,
            String rejectedReason
    ) {
    }

    public record ReviewTaskItem(
            Long id,
            Long revisionId,
            Integer reviewLevel,
            String status,
            String reviewerDisplayName,
            String reviewerRole,
            String branchName,
            String reviewComment,
            LocalDateTime createdAt,
            LocalDateTime reviewedAt
    ) {
    }

    public record SourceBindingItem(
            Long id,
            Long sourceId,
            String sourceDisplayName,
            String targetType,
            String targetDisplayName,
            String bindingReason,
            String confidenceLevel,
            String bindingStatus,
            String createdByDisplayName,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
    }

    public record TraceCoverage(
            String level,
            boolean complete,
            LocalDateTime historyFrom,
            List<String> truncatedSegments,
            List<String> missingSegments,
            List<String> notes
    ) {
    }
}
