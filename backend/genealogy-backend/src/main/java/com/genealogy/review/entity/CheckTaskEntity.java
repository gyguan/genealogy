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
@Table(name = "review_task")
public class CheckTaskEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "clan_id")
    private Long clanId;

    @Column(name = "revision_id")
    private Long revisionId;

    @Column(name = "review_level")
    private Integer reviewLevel;

    @Column(name = "reviewer_id")
    private Long reviewerId;

    @Column(name = "reviewer_role")
    private String reviewerRole;

    @Column(name = "branch_id")
    private Long branchId;

    private String status;

    @Column(name = "review_comment", columnDefinition = "text")
    private String reviewComment;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
