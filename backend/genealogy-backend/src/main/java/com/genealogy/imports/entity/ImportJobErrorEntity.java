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
@Table(name = "import_job_error")
public class ImportJobErrorEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long jobId;

    private Integer rowNo;

    @Column(columnDefinition = "text")
    private String errorMessage;

    @Column(columnDefinition = "text")
    private String rawData;

    private LocalDateTime createdAt;
}
