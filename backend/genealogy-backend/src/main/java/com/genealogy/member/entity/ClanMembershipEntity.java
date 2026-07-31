package com.genealogy.member.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.genealogy.member.enums.MemberStatus;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("clan_membership")
public class ClanMembershipEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long clanId;
    private Long userId;
    private Long personId;
    private String joinStatus;
    private MemberStatus memberStatus;
    private Long invitedBy;
    private LocalDateTime joinedAt;
    private Long createdBy;
    private LocalDateTime createdAt;
    private Long updatedBy;
    private LocalDateTime updatedAt;
}
