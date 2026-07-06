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
public class RevisionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long clanId;

    @Column(nullable = false)
    private String targetType;

    @Column(nullable = false)
    private Long targetId;

    @Column(nullable = false)
    private String changeType;

    @Column(name = "before_data", columnDefinition = "text")
    private String beforeData;

    @Column(name = "after_data", columnDefinition = "text")
    private String afterData;

    @Column(columnDefinition = "text")
    private String diffSummary;

    private Long submitterId;
    private LocalDateTime submitTime;
    private String status;
    private LocalDateTime approvedAt;

    @Column(columnDefinition = "text")
    private String rejectedReason;
}
