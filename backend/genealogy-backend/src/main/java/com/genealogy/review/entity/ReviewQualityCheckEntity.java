package com.genealogy.review.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "review_quality_check")
public class ReviewQualityCheckEntity {

    @Id
    private UUID id;

    @Column(name = "clan_id", nullable = false)
    private Long clanId;

    @Column(name = "scope_type", nullable = false, length = 32)
    private String scopeType;

    @Column(nullable = false, length = 32)
    private String mode;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "scope_fingerprint", nullable = false, length = 128)
    private String scopeFingerprint;

    @Column(name = "task_ids_json", nullable = false, columnDefinition = "text")
    private String taskIdsJson;

    @Column(name = "query_json", columnDefinition = "text")
    private String queryJson;

    @Column(name = "rule_codes_json", columnDefinition = "text")
    private String ruleCodesJson;

    @Column(name = "summary_json", columnDefinition = "text")
    private String summaryJson;

    @Column(name = "rules_json", columnDefinition = "text")
    private String rulesJson;

    @Column(name = "review_blocked", nullable = false)
    private boolean reviewBlocked;

    @Column(name = "triggered_by", nullable = false)
    private Long triggeredBy;

    @Column(name = "queued_at", nullable = false)
    private LocalDateTime queuedAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "failure_code", length = 80)
    private String failureCode;

    @Column(name = "failure_message", length = 500)
    private String failureMessage;
}
