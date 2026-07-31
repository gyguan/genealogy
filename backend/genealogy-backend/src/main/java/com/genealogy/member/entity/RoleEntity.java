package com.genealogy.member.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("app_role")
public class RoleEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String roleCode;
    private String roleName;
    private String description;
    private Boolean systemRole;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
