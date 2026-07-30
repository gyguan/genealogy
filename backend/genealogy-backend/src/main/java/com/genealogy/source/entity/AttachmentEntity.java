package com.genealogy.source.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("attachment")
public class AttachmentEntity {
    @TableId(type = IdType.AUTO)
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
