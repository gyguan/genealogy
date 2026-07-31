package com.genealogy.auth.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("app_auth_security_event")
public class AuthSecurityEventEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String eventType;
    private String resultCode;
    private String riskLevel;
    private String ipMasked;
    private String userAgent;
    private String requestId;
    private String detail;
    private LocalDateTime createdAt;
}
