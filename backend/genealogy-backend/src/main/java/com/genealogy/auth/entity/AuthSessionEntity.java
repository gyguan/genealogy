package com.genealogy.auth.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("app_auth_session")
public class AuthSessionEntity {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String tokenHash;
    private String csrfTokenHash;
    private LocalDateTime issuedAt;
    private LocalDateTime lastAccessAt;
    private LocalDateTime expiresAt;
    private LocalDateTime revokedAt;
    private String clientIp;
    private String userAgent;
    private String deviceName;
    private boolean rememberMe;
}
