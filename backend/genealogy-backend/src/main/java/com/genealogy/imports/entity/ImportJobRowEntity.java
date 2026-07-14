package com.genealogy.imports.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@Entity
@Table(name = "import_job_row")
public class ImportJobRowEntity {

    public static final String STATUS_INVALID = "invalid";
    public static final String STATUS_DRAFT_CREATED = "draft_created";
    public static final String STATUS_RETRY_FAILED = "retry_failed";
    public static final String STATUS_EXCLUDED = "excluded";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false)
    private Long jobId;

    @Column(name = "row_no", nullable = false)
    private Integer rowNo;

    @Column(name = "raw_data", nullable = false, columnDefinition = "text")
    private String rawData;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "normalized_data", columnDefinition = "jsonb")
    private Map<String, Object> normalizedData;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "corrected_data", columnDefinition = "jsonb")
    private Map<String, Object> correctedData;

    @Column(name = "row_status", nullable = false)
    private String rowStatus;

    @Column(name = "error_code")
    private String errorCode;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(name = "draft_person_id")
    private Long draftPersonId;

    @Column(name = "draft_target_type")
    private String draftTargetType;

    @Column(name = "draft_target_id")
    private Long draftTargetId;

    @Column(name = "retry_count", nullable = false)
    private Integer retryCount;

    @Column(name = "corrected_by")
    private Long correctedBy;

    @Column(name = "corrected_at")
    private LocalDateTime correctedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
