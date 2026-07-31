package com.genealogy.auth.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("app_login_attempt")
public class AuthLoginAttemptEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String accountHash;
    private String ipHash;
    private Long userId;
    private boolean success;
    private String resultCode;
    private LocalDateTime createdAt;
}
