package com.genealogy.review.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "revision")
public class RevisionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "clan_id")
    private Long clanId;

    @Column(name = "trace_id")
    private UUID traceId;

    @Column(name = "target_type")
    private String targetType;

    @Column(name = "target_id")
    private Long targetId;

    @Column(name = "change_type")
    private String changeType;

    @Column(name = "before_data", columnDefinition = "text")
    private String beforeData;

    @Column(name = "after_data", columnDefinition = "text")
    private String afterData;

    @Column(name = "diff_summary", columnDefinition = "text")
    private String diffSummary;

    @Column(name = "submitter_id")
    private Long submitterId;

    @Column(name = "submit_time")
    private LocalDateTime submitTime;

    private String status;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejected_reason", columnDefinition = "text")
    private String rejectedReason;

    @PrePersist
    void ensureTraceId() {
        if (traceId == null) {
            traceId = UUID.randomUUID();
        }
    }
}

