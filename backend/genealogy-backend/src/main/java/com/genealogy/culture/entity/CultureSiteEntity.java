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

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Setter
@TableName("culture_site")
public class CultureSiteEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long clanId;
    private Long branchId;
    private Long relatedPersonId;
    private String siteType;
    private String siteName;
    private String addressText;
    private String foundedPeriod;
    private String currentStatus;
    private String summary;
    private String description;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String confidenceLevel = CultureConfidenceLevel.UNKNOWN.value();
    private String privacyLevel = CulturePrivacyLevel.CLAN_ONLY.value();
    private String sensitiveLevel = CultureSensitiveLevel.NORMAL.value();
    private String dataStatus = CultureDataStatus.DRAFT.value();
    private boolean featuredOnHome;
    private Integer sortOrder = 0;
    private Long createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime deletedAt;
    private Long version;
}
