package com.genealogy.relationship.entity;

import com.genealogy.relationship.domain.RelationshipCategoryEntityListener;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
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
@EntityListeners(RelationshipCategoryEntityListener.class)
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

    /** blood, ritual, marriage or status. */
    @Column(nullable = false)
    private String relationCategory;

    private String ritualRelationType;

    @Column(columnDefinition = "text")
    private String successionReason;

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
