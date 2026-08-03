package com.genealogy.imports.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName(value = "import_job_chunk")
public class ImportJobChunkEntity {

    public static final String STAGE_DRAFTING = "drafting";
    public static final String STAGE_PUBLISHING = "publishing";
    public static final String STATUS_RUNNING = "running";
    public static final String STATUS_COMPLETED = "completed";
    public static final String STATUS_FAILED = "failed";

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long jobId;
    private String stage;
    private Integer chunkNo;
    private Integer fromRowNo;
    private Integer toRowNo;
    private String idempotencyKey;
    private String status;
    private Integer attemptCount;
    private String errorSummary;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private Long version;
}
