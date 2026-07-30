package com.genealogy.member.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("app_permission")
public class PermissionEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String permissionCode;
    private String permissionName;
    private String moduleCode;
    private String actionCode;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
