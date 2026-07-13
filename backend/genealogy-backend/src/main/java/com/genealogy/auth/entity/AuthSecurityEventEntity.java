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
@Table(name = "app_auth_security_event")
public class AuthSecurityEventEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
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
