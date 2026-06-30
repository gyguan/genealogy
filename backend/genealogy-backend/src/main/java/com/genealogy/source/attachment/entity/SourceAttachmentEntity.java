package com.genealogy.source.attachment.entity;

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
@Table(name = "source_attachment")
public class SourceAttachmentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long sourceId;

    private Long clanId;

    @Column(nullable = false)
    private String originalFilename;

    @Column(nullable = false)
    private String storedFilename;

    private String contentType;
    private Long fileSize;

    @Column(nullable = false)
    private String storagePath;

    private String checksum;
    private String uploadStatus;
    private Long createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime deletedAt;
}
