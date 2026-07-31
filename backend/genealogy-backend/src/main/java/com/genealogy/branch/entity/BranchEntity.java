package com.genealogy.branch.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("branch")
public class BranchEntity {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long clanId;
    private Long parentId;
    private String branchName;
    private String branchPath;
    private Integer level;
    private Integer sortOrder;
    private Long founderPersonId;
    private String migrationFrom;
    private String migrationTo;
    private Long managerMemberId;
    private String description;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
