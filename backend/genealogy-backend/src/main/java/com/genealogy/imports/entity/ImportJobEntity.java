package com.genealogy.imports.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.genealogy.imports.domain.ImportJobDescriptor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName(value = "import_job")
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
    public static final String EXECUTION_PARTIAL_FAILED = "partial_failed";
    public static final String EXECUTION_FAILED = "failed";
    public static final String EXECUTION_CANCELLED = "cancelled";
    public static final String EXECUTION_PARTIAL_CANCELLED = "partial_cancelled";
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

    @TableId(type = IdType.AUTO)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long clanId;
    private Long branchId;
    private String importType;
    private String fileFormat;
    private String originalFilename;
    private String idempotencyKey;
    private Integer totalCount;
    private Integer successCount;
    private Integer failureCount;
    private Integer skippedCount;

    /**
     * Legacy execution status retained for existing API and UI compatibility.
     */
    private String status;
    private String processingStatus;
    private String reviewStatus;
    private Integer reviewRound;
    private Long latestReviewTaskId;
    private Long parentJobId;
    private String errorSummary;
    private String executionMode;
    private String executionStatus;
    private String executionStage;
    private Integer cursorRowNo;
    private Integer processedCount;
    private Integer publishedCount;
    private Integer chunkSize;
    private Integer executionRetryCount;
    private Integer executionMaxRetries;
    private String requestedAction;
    private String failureStage;
    private String lastErrorCode;
    private String leaseOwner;
    private LocalDateTime leaseExpiresAt;
    private LocalDateTime nextRetryAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime heartbeatAt;
    private Boolean manualInterventionRequired;
    private Long createdBy;
    private LocalDateTime createdAt;
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
    public void normalizeDescriptor() {
        ImportJobDescriptor descriptor = ImportJobDescriptor.resolve(importType, fileFormat, originalFilename);
        this.importType = descriptor.importType();
        this.fileFormat = descriptor.fileFormat();
        if (executionMode == null || executionMode.isBlank()) executionMode = EXECUTION_MODE_SYNC;
        if (executionStatus == null || executionStatus.isBlank()) executionStatus = EXECUTION_COMPLETED;
        if (executionStage == null || executionStage.isBlank()) executionStage = STAGE_COMPLETED;
        if (cursorRowNo == null) cursorRowNo = 0;
        if (processedCount == null) processedCount = 0;
        if (publishedCount == null) publishedCount = 0;
        if (skippedCount == null) skippedCount = 0;
        if (chunkSize == null || chunkSize <= 0) chunkSize = 200;
        if (executionRetryCount == null || executionRetryCount < 0) executionRetryCount = 0;
        if (executionMaxRetries == null || executionMaxRetries <= 0) executionMaxRetries = 3;
        if (manualInterventionRequired == null) manualInterventionRequired = false;
    }
}
