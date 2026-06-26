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
    private String summary;

    @Column(columnDefinition = "text")
    private String detail;

    private String requestId;
    private String clientIp;
    private LocalDateTime createdAt;
}
