package com.genealogy.operationlog.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "operation_log")
public class OperationLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long clanId;
    private Long actorId;
    private String actionType;
    private String targetType;
    private Long targetId;

    @Column(name = "trace_id")
    private UUID traceId;

    @Column(name = "revision_id")
    private Long revisionId;

    @Column(name = "review_task_id")
    private Long reviewTaskId;

    @Column(name = "business_target_type")
    private String businessTargetType;

    @Column(name = "business_target_id")
    private Long businessTargetId;

    @Column(name = "event_result")
    private String eventResult;

    private String summary;

    @Column(columnDefinition = "text")
    private String detail;

    private String requestId;
    private String clientIp;
    private LocalDateTime createdAt;
}
