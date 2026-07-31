package com.genealogy.operationlog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@TableName("operation_log")
public class OperationLogEntity {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long clanId;
    private Long actorId;
    private String actionType;
    private String targetType;
    private Long targetId;
    private UUID traceId;
    private Long revisionId;
    private Long reviewTaskId;
    private String businessTargetType;
    private Long businessTargetId;
    private String eventResult;
    private String riskLevel;
    private String riskEventType;
    private String dispositionStatus;
    private Long branchId;
    private String summary;
    private String detail;
    private String requestId;
    private String clientIp;
    private LocalDateTime createdAt;
}
