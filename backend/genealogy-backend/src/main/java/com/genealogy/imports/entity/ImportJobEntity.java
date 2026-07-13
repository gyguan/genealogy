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

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
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
        ImportJobDescriptor descriptor = ImportJobDescriptor.resolve(importType, this.fileFormat, this.originalFilename);
        this.importType = descriptor.importType();
        this.fileFormat = descriptor.fileFormat();
    }

    public void setFileFormat(String fileFormat) {
        if (fileFormat == null || fileFormat.isBlank()) {
            this.fileFormat = fileFormat;
            return;
        }
        ImportJobDescriptor descriptor = ImportJobDescriptor.resolve(this.importType, fileFormat, this.originalFilename);
        this.importType = descriptor.importType();
        this.fileFormat = descriptor.fileFormat();
    }

    @PrePersist
    @PreUpdate
    @PostLoad
    void normalizeDescriptor() {
        ImportJobDescriptor descriptor = ImportJobDescriptor.resolve(importType, fileFormat, originalFilename);
        this.importType = descriptor.importType();
        this.fileFormat = descriptor.fileFormat();
    }
}
