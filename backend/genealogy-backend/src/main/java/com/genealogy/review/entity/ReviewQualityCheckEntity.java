package com.genealogy.review.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@TableName("review_quality_check")
public class ReviewQualityCheckEntity {
    @TableId(type = IdType.INPUT)
    private UUID id;
    private Long clanId;
    private String scopeType;
    private String mode;
    private String status;
    private String scopeFingerprint;
    private String taskIdsJson;
    private String queryJson;
    private String ruleCodesJson;
    private String summaryJson;
    private String rulesJson;
    private boolean reviewBlocked;
    private Long triggeredBy;
    private LocalDateTime queuedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String failureCode;
    private String failureMessage;
}
