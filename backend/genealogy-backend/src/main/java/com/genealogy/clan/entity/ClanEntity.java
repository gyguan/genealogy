package com.genealogy.clan.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("clan")
public class ClanEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String clanCode;
    private String clanName;
    private String surname;
    private String hallName;
    private String commandery;
    private Long ancestorPersonId;
    private String originPlace;
    private String description;
    private String status;
    private Long createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
