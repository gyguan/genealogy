package com.genealogy.auth.entity;

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
@Table(name = "app_auth_session")
public class AuthSessionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
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
