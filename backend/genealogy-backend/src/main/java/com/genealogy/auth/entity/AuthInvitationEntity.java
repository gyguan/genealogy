package com.genealogy.auth.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("app_account_invite")
public class AuthInvitationEntity {
    @TableId(type = IdType.AUTO)
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
