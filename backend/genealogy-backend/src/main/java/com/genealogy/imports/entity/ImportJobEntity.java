package com.genealogy.imports.entity;

import com.genealogy.imports.domain.ImportJobDescriptor;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.DynamicUpdate;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@DynamicUpdate
@Table(name = "import_job")
public class ImportJobEntity {

    public static final String TYPE_PERSON = "person";
    public static final String TYPE_RELATIONSHIP = "relationship";
    public static final String TYPE_GENERATION = "generation";
    public static final String TYPE_SOURCE = "source";

    public static final String FORMAT_CSV = "csv";
    public static final String FORMAT_XLSX = "xlsx";

    public static final String PROCESSING_PROCESSING = "processing";
    public static final String PROCESSING_CORRECTION_REQUIRED = "correction_required";
    public static final String PROCESSING_READY_FOR_REVIEW = "ready_for_review";

    public static final String REVIEW_NOT_SUBMITTED = "not_submitted";
    public static final String REVIEW_PENDING = "pending";
    public static final String REVIEW_APPROVED = "approved";
    public static final String REVIEW_REJECTED = "rejected";
    public static final String REVIEW_CANCELLED = "cancelled";

    public static final String EXECUTION_MODE_SYNC = "sync";
    public static final String EXECUTION_MODE_ASYNC = "async";

    public static final String EXECUTION_QUEUED = "queued";
    public static final String EXECUTION_RUNNING = "running";
    public static final String EXECUTION_PAUSED = "paused";
    public static final String EXECUTION_RETRY_WAIT = "retry_wait";
    public static final String EXECUTION_COMPLETED = "completed";
    public static final String EXECUTION_FAILED = "failed";
    public static final String EXECUTION_CANCELLED = "cancelled";
    public static final String EXECUTION_DEAD_LETTER = "dead_letter";

    public static final String STAGE_QUEUED = "queued";
    public static final String STAGE_PARSING = "parsing";
    public static final String STAGE_DRAFTING = "drafting";
    public static final String STAGE_READY_FOR_REVIEW = "ready_for_review";
    public static final String STAGE_PUBLISHING = "publishing";
    public static final String STAGE_COMPLETED = "completed";
    public static final String STAGE_FAILED = "failed";
    public static final String STAGE_CANCELLED = "cancelled";

    public static final String ACTION_PAUSE = "pause";
    public static final String ACTION_CANCEL = "cancel";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "clan_id", nullable = false)
    private Long clanId;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "import_type", nullable = false)
    private String importType;

    @Column(name = "file_format", nullable = false)
    private String fileFormat;

    @Column(name = "original_filename")
    private String originalFilename;

    @Column(name = "total_count")
    private Integer totalCount;

    @Column(name = "success_count")
    private Integer successCount;

    @Column(name = "failure_count")
    private Integer failureCount;

    /**
     * Legacy execution status retained for existing API and UI compatibility.
     */
    private String status;

    @Column(name = "processing_status", nullable = false)
    private String processingStatus;

    @Column(name = "review_status", nullable = false)
    private String reviewStatus;

    @Column(name = "review_round", nullable = false)
    private Integer reviewRound;

    @Column(name = "latest_review_task_id")
    private Long latestReviewTaskId;

    @Column(name = "parent_job_id")
    private Long parentJobId;

    @Column(name = "error_summary", columnDefinition = "text")
    private String errorSummary;

    @Column(name = "execution_mode", nullable = false)
    private String executionMode;

    @Column(name = "execution_status", nullable = false)
    private String executionStatus;

    @Column(name = "execution_stage", nullable = false)
    private String executionStage;

    @Column(name = "cursor_row_no", nullable = false)
    private Integer cursorRowNo;

    @Column(name = "processed_count", nullable = false)
    private Integer processedCount;

    @Column(name = "published_count", nullable = false)
    private Integer publishedCount;

    @Column(name = "chunk_size", nullable = false)
    private Integer chunkSize;

    @Column(name = "execution_retry_count", nullable = false)
    private Integer executionRetryCount;

    @Column(name = "execution_max_retries", nullable = false)
    private Integer executionMaxRetries;

    @Column(name = "requested_action")
    private String requestedAction;

    @Column(name = "failure_stage")
    private String failureStage;

    @Column(name = "last_error_code")
    private String lastErrorCode;

    @Column(name = "lease_owner")
    private String leaseOwner;

    @Column(name = "lease_expires_at")
    private LocalDateTime leaseExpiresAt;

    @Column(name = "next_retry_at")
    private LocalDateTime nextRetryAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "heartbeat_at")
    private LocalDateTime heartbeatAt;

    @Column(name = "manual_intervention_required", nullable = false)
    private Boolean manualInterventionRequired;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public void setImportType(String importType) {
        if (importType == null || importType.isBlank()) {
            this.importType = importType;
            return;
        }
        ImportJobDescriptor descriptor = ImportJobDescriptor.fromFilter(importType, this.fileFormat);
        this.importType = descriptor.importType();
        this.fileFormat = descriptor.fileFormat();
    }

    public void setFileFormat(String fileFormat) {
        if (fileFormat == null || fileFormat.isBlank()) {
            this.fileFormat = fileFormat;
            return;
        }
        ImportJobDescriptor descriptor = ImportJobDescriptor.fromFilter(this.importType, fileFormat);
        this.importType = descriptor.importType();
        this.fileFormat = descriptor.fileFormat();
    }

    public boolean isAsyncExecution() {
        return EXECUTION_MODE_ASYNC.equals(executionMode);
    }

    @PrePersist
    @PreUpdate
    @PostLoad
    void normalizeDescriptor() {
        ImportJobDescriptor descriptor = ImportJobDescriptor.resolve(importType, fileFormat, originalFilename);
        this.importType = descriptor.importType();
        this.fileFormat = descriptor.fileFormat();
        if (executionMode == null || executionMode.isBlank()) executionMode = EXECUTION_MODE_SYNC;
        if (executionStatus == null || executionStatus.isBlank()) executionStatus = EXECUTION_COMPLETED;
        if (executionStage == null || executionStage.isBlank()) executionStage = STAGE_COMPLETED;
        if (cursorRowNo == null) cursorRowNo = 0;
        if (processedCount == null) processedCount = 0;
        if (publishedCount == null) publishedCount = 0;
        if (chunkSize == null || chunkSize <= 0) chunkSize = 200;
        if (executionRetryCount == null || executionRetryCount < 0) executionRetryCount = 0;
        if (executionMaxRetries == null || executionMaxRetries <= 0) executionMaxRetries = 3;
        if (manualInterventionRequired == null) manualInterventionRequired = false;
    }
}
