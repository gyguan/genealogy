package com.genealogy.source.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("source_attachment")
public class SourceAttachmentEntity {
    @TableId(type = IdType.AUTO)
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
