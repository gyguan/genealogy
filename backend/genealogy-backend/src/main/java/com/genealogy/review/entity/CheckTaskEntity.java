package com.genealogy.review.entity;

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

    private Long clanId;
    private Long revisionId;
    private Integer reviewLevel;
    private Long reviewerId;
    private String reviewerRole;
    private Long branchId;
    private String status;
    private String reviewComment;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
}
