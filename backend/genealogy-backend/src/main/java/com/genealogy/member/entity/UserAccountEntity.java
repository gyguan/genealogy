package com.genealogy.member.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("user_account")
public class UserAccountEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String username;
    private String phone;
    private String email;
    private String displayName;
    private String passwordHash;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
}
