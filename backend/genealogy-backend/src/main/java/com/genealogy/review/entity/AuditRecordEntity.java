package com.genealogy.review.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "revision")
public class AuditRecordEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long clanId;
    private String targetType;
    private Long targetId;
    private String changeType;

    @Column(name = "before_data", columnDefinition = "text")
    private String oldPayload;

    @Column(name = "after_data", columnDefinition = "text")
    private String newPayload;

    private String diffSummary;
    private Long submitterId;
    private LocalDateTime submitTime;
    private String status;
    private LocalDateTime approvedAt;
    private String rejectedReason;
}
