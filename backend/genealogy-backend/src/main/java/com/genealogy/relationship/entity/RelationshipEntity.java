package com.genealogy.relationship.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("relationship")
public class RelationshipEntity {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long clanId;
    private Long fromPersonId;
    private Long toPersonId;
    private String relationType;
    private String relationLabel;
    private String relationCategory;
    private String ritualRelationType;
    private String successionReason;
    private Long successorBranchId;
    private Boolean isLineageRelation;
    private Boolean isBiological;
    private Boolean isPrimary;
    private String description;
    private String confidenceLevel;
    private String dataStatus;
    private Long createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;
}
