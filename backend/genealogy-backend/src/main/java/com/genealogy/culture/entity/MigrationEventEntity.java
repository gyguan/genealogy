package com.genealogy.culture.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.genealogy.culture.domain.CultureConfidenceLevel;
import com.genealogy.culture.domain.CultureDataStatus;
import com.genealogy.culture.domain.CulturePrivacyLevel;
import com.genealogy.culture.domain.CultureSensitiveLevel;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@TableName("migration_event")
public class MigrationEventEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long clanId;

    private Long branchId;

    private Integer sequenceNo;

    private String fromLocation;

    private String toLocation;

    private String migrationTimeText;

    private Long founderPersonId;

    private String reason;

    private String description;

    private String confidenceLevel = CultureConfidenceLevel.UNKNOWN.value();

    private String privacyLevel = CulturePrivacyLevel.CLAN_ONLY.value();

    private String sensitiveLevel = CultureSensitiveLevel.NORMAL.value();

    private String dataStatus = CultureDataStatus.DRAFT.value();

    private Long createdBy;

    private OffsetDateTime createdAt;

    private OffsetDateTime updatedAt;

    private OffsetDateTime deletedAt;

    private Long version;
}
