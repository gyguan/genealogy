package com.genealogy.culture.entity;

import com.genealogy.culture.domain.CultureConfidenceLevel;
import com.genealogy.culture.domain.CultureDataStatus;
import com.genealogy.culture.domain.CulturePrivacyLevel;
import com.genealogy.culture.domain.CultureSensitiveLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "migration_event")
public class MigrationEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long clanId;

    @Column(nullable = false)
    private Long branchId;

    @Column(nullable = false)
    private Integer sequenceNo;

    @Column(length = 500)
    private String fromLocation;

    @Column(length = 500)
    private String toLocation;

    @Column(length = 200)
    private String migrationTimeText;

    private Long founderPersonId;

    @Column(length = 1000)
    private String reason;

    @Column(columnDefinition = "text")
    private String description;

    @Column(nullable = false, length = 20)
    private String confidenceLevel = CultureConfidenceLevel.UNKNOWN.value();

    @Column(nullable = false, length = 32)
    private String privacyLevel = CulturePrivacyLevel.CLAN_ONLY.value();

    @Column(nullable = false, length = 32)
    private String sensitiveLevel = CultureSensitiveLevel.NORMAL.value();

    @Column(nullable = false, length = 32)
    private String dataStatus = CultureDataStatus.DRAFT.value();

    private Long createdBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    private OffsetDateTime deletedAt;

    @Version
    @Column(nullable = false)
    private Long version;
}
