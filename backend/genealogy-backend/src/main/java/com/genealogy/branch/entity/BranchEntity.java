package com.genealogy.branch.entity;

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
@Table(name = "branch")
public class BranchEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long clanId;

    private Long parentId;

    @Column(nullable = false)
    private String branchName;

    private String branchPath;
    private Integer level;
    private Integer sortOrder;
    private Long founderPersonId;
    private String migrationFrom;
    private String migrationTo;
    private Long managerMemberId;

    @Column(columnDefinition = "text")
    private String description;

    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
