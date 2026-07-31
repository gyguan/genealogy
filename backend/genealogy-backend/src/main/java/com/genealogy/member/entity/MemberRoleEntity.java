package com.genealogy.member.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.genealogy.member.enums.MemberRoleScopeType;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("member_role")
public class MemberRoleEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long membershipId;
    private Long roleId;
    private MemberRoleScopeType scopeType;
    private Long scopeId;
    private String status;
    private Long grantedBy;
    private LocalDateTime grantedAt;
    private LocalDateTime revokedAt;
    private Long createdBy;
    private LocalDateTime createdAt;
    private Long updatedBy;
    private LocalDateTime updatedAt;
}
