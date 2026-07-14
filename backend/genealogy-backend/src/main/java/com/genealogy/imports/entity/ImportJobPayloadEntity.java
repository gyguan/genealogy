package com.genealogy.imports.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "import_job_payload")
public class ImportJobPayloadEntity {

    @Id
    @Column(name = "job_id")
    private Long jobId;

    @Column(name = "original_filename", nullable = false, length = 512)
    private String originalFilename;

    @Column(name = "content_type")
    private String contentType;

    @Lob
    @Column(name = "file_content", nullable = false, columnDefinition = "bytea")
    private byte[] fileContent;

    @Column(name = "confirm_duplicates", nullable = false)
    private Boolean confirmDuplicates;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
