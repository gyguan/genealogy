package com.genealogy.source.entity;

import com.genealogy.common.domain.DraftDeletePolicy;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PreRemove;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "source")
public class SourceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long clanId;

    @Column(nullable = false)
    private String sourceName;

    @Column(nullable = false)
    private String sourceType;

    private String providerName;
    private String bookTitle;
    private String volumeNo;
    private String pageNo;
    private String sourceDate;

    @Column(columnDefinition = "text")
    private String excerpt;

    @Column(nullable = false)
    private String verificationStatus;

    @Column(columnDefinition = "text")
    private String description;

    @Column(nullable = false)
    private String confidenceLevel;

    @Column(nullable = false)
    private String privacyLevel;

    @Column(nullable = false)
    private String sensitiveLevel;

    private Long createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PreRemove
    void requireDraftForDirectDelete() {
        DraftDeletePolicy.requireDraft(
                verificationStatus,
                "SOURCE_DELETE_DRAFT_ONLY",
                "仅草稿来源可直接删除"
        );
    }
}
