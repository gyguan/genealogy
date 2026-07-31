package com.genealogy.review.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@TableName("revision")
public class AuditRecordEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long clanId;
    private UUID traceId;
    private String targetType;
    private Long targetId;
    private String changeType;
    @TableField("before_data")
    private String oldPayload;
    @TableField("after_data")
    private String newPayload;
    private String diffSummary;
    private Long submitterId;
    private LocalDateTime submitTime;
    private String status;
    private LocalDateTime approvedAt;
    private String rejectedReason;

    public void ensureTraceId() {
        if (traceId == null) traceId = UUID.randomUUID();
    }
}
