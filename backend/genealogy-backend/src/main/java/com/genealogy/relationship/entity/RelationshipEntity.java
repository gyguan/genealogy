package com.genealogy.relationship.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "relationship")
public class RelationshipEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long clanId;

    @Column(nullable = false)
    private Long fromPersonId;

    @Column(nullable = false)
    private Long toPersonId;

    @Column(nullable = false)
    private String relationType;

    private String relationLabel;

    /**
     * blood: 血缘关系；ritual: 礼法承嗣关系；marriage: 婚配关系；status: 状态标记。
     */
    private String relationCategory;

    /**
     * 入继、出继、承祧、兼祧、嗣子、无嗣等宗法承嗣细分类型。
     */
    private String ritualRelationType;

    /**
     * 立嗣原因或宗法说明，例如无嗣、兼祧、承继某房等。
     */
    @Column(columnDefinition = "text")
    private String successionReason;

    /**
     * 承继房支 ID，用于表示入继/承祧/兼祧所承继的房支。
     */
    private Long successorBranchId;

    private Boolean isLineageRelation;
    private Boolean isBiological;
    private Boolean isPrimary;

    @Column(columnDefinition = "text")
    private String description;

    private String confidenceLevel;
    private String dataStatus;
    private Long createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;
}
