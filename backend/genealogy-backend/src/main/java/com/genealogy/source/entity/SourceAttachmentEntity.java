package com.genealogy.source.entity;

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
@Table(name = "source_attachment")
public class SourceAttachmentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long sourceId;
    private Long clanId;
    private String originalFilename;
    private String storedFilename;
    private String contentType;
    private Long fileSize;
    private String storagePath;
    private String checksum;
    private String uploadStatus;
    private String privacyLevel;
    private String sensitiveLevel;
    private Long createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime deletedAt;
}
