package com.genealogy.imports.entity;

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
@Table(name = "import_job")
public class ImportJobEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long clanId;

    private Long branchId;
    private String importType;
    private String originalFilename;
    private Integer totalCount;
    private Integer successCount;
    private Integer failureCount;
    private String status;

    @Column(columnDefinition = "text")
    private String errorSummary;

    private Long createdBy;
    private LocalDateTime createdAt;
}
