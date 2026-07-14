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

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "import_job_chunk")
public class ImportJobChunkEntity {

    public static final String STAGE_DRAFTING = "drafting";
    public static final String STAGE_PUBLISHING = "publishing";
    public static final String STATUS_RUNNING = "running";
    public static final String STATUS_COMPLETED = "completed";
    public static final String STATUS_FAILED = "failed";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false)
    private Long jobId;

    @Column(name = "stage", nullable = false)
    private String stage;

    @Column(name = "chunk_no", nullable = false)
    private Integer chunkNo;

    @Column(name = "from_row_no", nullable = false)
    private Integer fromRowNo;

    @Column(name = "to_row_no", nullable = false)
    private Integer toRowNo;

    @Column(name = "idempotency_key", nullable = false, length = 160)
    private String idempotencyKey;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "attempt_count", nullable = false)
    private Integer attemptCount;

    @Column(name = "error_summary", columnDefinition = "text")
    private String errorSummary;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
