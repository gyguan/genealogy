package com.genealogy.imports.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.TableField;
import com.genealogy.common.persistence.mybatis.JsonMapTypeHandler;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@TableName(value = "import_job_row", autoResultMap = true)
public class ImportJobRowEntity {

    public static final String STATUS_INVALID = "invalid";
    public static final String STATUS_DRAFT_CREATED = "draft_created";
    public static final String STATUS_RETRY_FAILED = "retry_failed";
    public static final String STATUS_EXCLUDED = "excluded";

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long jobId;
    private Integer rowNo;
    private String rawData;
    @TableField(typeHandler = JsonMapTypeHandler.class)
    private Map<String, Object> normalizedData;
    @TableField(typeHandler = JsonMapTypeHandler.class)
    private Map<String, Object> correctedData;
    private String rowStatus;
    private String errorCode;
    private String errorMessage;
    private Long draftPersonId;
    private String draftTargetType;
    private Long draftTargetId;
    private Integer retryCount;
    private Long correctedBy;
    private LocalDateTime correctedAt;
    private String excludedReason;
    private Long excludedBy;
    private LocalDateTime excludedAt;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long version;
}
