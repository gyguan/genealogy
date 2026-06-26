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
@Table(name = "attachment")
public class AttachmentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long clanId;
    private Long sourceId;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String storagePath;
    private String thumbnailPath;
    private String checksum;
    private Long uploadedBy;
    private LocalDateTime uploadedAt;
    private String accessLevel;
}
