package com.genealogy.culture.entity;

import com.genealogy.culture.domain.CultureConfidenceLevel;
import com.genealogy.culture.domain.CultureDataStatus;
import com.genealogy.culture.domain.CulturePrivacyLevel;
import com.genealogy.culture.domain.CultureSensitiveLevel;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "culture_site")
public class CultureSiteEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long clanId;
    private Long branchId;
    private Long relatedPersonId;
    @Column(nullable = false, length = 40)
    private String siteType;
    @Column(nullable = false, length = 200)
    private String siteName;
    @Column(length = 500)
    private String addressText;
    @Column(length = 200)
    private String foundedPeriod;
    @Column(length = 100)
    private String currentStatus;
    @Column(length = 1000)
    private String summary;
    @Column(columnDefinition = "text")
    private String description;
    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;
    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;
    @Column(nullable = false, length = 20)
    private String confidenceLevel = CultureConfidenceLevel.UNKNOWN.value();
    @Column(nullable = false, length = 32)
    private String privacyLevel = CulturePrivacyLevel.CLAN_ONLY.value();
    @Column(nullable = false, length = 32)
    private String sensitiveLevel = CultureSensitiveLevel.NORMAL.value();
    @Column(nullable = false, length = 32)
    private String dataStatus = CultureDataStatus.DRAFT.value();
    @Column(name = "is_featured_on_home", nullable = false)
    private boolean featuredOnHome;
    @Column(nullable = false)
    private Integer sortOrder = 0;
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
