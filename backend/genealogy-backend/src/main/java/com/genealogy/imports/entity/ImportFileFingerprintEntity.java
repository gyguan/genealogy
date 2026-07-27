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
@Table(name = "import_file_fingerprint")
public class ImportFileFingerprintEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "clan_id", nullable = false)
    private Long clanId;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "import_type", nullable = false, length = 32)
    private String importType;

    @Column(name = "file_hash", nullable = false, length = 64)
    private String fileHash;

    @Column(name = "job_id", nullable = false)
    private Long jobId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
