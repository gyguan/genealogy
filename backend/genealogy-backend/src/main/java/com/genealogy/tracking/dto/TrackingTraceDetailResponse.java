package com.genealogy.tracking.dto;

import com.genealogy.operationlog.dto.OperationLogResponse;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record TrackingTraceDetailResponse(
        TrackingObjectResponse objectSummary,
        String currentStatus,
        List<TimelineEvent> timeline,
        List<ChangeChain> changeChains,
        List<RevisionItem> revisions,
        List<ReviewTaskItem> reviewTasks,
        List<SourceBindingItem> sourceBindings,
        List<OperationLogResponse> operationLogs,
        List<String> allowedActions,
        TraceCoverage traceCoverage
) {

    public TrackingTraceDetailResponse(
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
        this(objectSummary, currentStatus, timeline, List.of(), revisions, reviewTasks, sourceBindings,
                operationLogs, allowedActions, traceCoverage);
    }

    public record TimelineEvent(
            String eventKey,
            String eventType,
            String sourceType,
            Long sourceId,
            String title,
            String summary,
            LocalDateTime occurredAt,
            String actorDisplayName,
            String resultStatus,
            UUID traceId,
            Long revisionId,
            Long reviewTaskId,
            String eventResult
    ) {
        public TimelineEvent(
                String eventKey, String eventType, String sourceType, Long sourceId, String title,
                String summary, LocalDateTime occurredAt, String actorDisplayName, String resultStatus
        ) {
            this(eventKey, eventType, sourceType, sourceId, title, summary, occurredAt,
                    actorDisplayName, resultStatus, null, null, null, null);
        }
    }

    public record ChangeChain(
            String chainKey,
            UUID traceId,
            String compatibilityStatus,
            Long revisionId,
            List<Long> reviewTaskIds,
            String businessTargetType,
            Long businessTargetId,
            String resultStatus,
            LocalDateTime startedAt,
            LocalDateTime completedAt,
            List<String> eventKeys
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
            String rejectedReason,
            UUID traceId
    ) {
        public RevisionItem(
                Long id, String changeType, String status, String diffSummary, String submitterDisplayName,
                LocalDateTime submitTime, LocalDateTime approvedAt, String rejectedReason
        ) {
            this(id, changeType, status, diffSummary, submitterDisplayName, submitTime, approvedAt,
                    rejectedReason, null);
        }
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
            LocalDateTime reviewedAt,
            UUID traceId
    ) {
        public ReviewTaskItem(
                Long id, Long revisionId, Integer reviewLevel, String status, String reviewerDisplayName,
                String reviewerRole, String branchName, String reviewComment, LocalDateTime createdAt,
                LocalDateTime reviewedAt
        ) {
            this(id, revisionId, reviewLevel, status, reviewerDisplayName, reviewerRole, branchName,
                    reviewComment, createdAt, reviewedAt, null);
        }
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
