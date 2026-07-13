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
@Table(name = "app_account_invite")
public class AuthInvitationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String tokenHash;
    private Long clanId;
    private String email;
    private String roleCode;
    private String scopeType;
    private Long scopeId;
    private Long invitedBy;
    private String status;
    private LocalDateTime expiresAt;
    private LocalDateTime acceptedAt;
    private Long acceptedUserId;
    private LocalDateTime createdAt;
}
