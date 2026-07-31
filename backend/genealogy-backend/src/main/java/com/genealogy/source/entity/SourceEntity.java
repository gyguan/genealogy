package com.genealogy.source.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.genealogy.common.domain.DraftDeletePolicy;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("source")
public class SourceEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long clanId;
    private String sourceName;
    private String sourceType;
    private String providerName;
    private String bookTitle;
    private String volumeNo;
    private String pageNo;
    private String sourceDate;
    private String excerpt;
    private String verificationStatus;
    private String description;
    private String confidenceLevel;
    private String privacyLevel;
    private String sensitiveLevel;
    private Long createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public void requireDraftForDirectDelete() {
        DraftDeletePolicy.requireDraft(verificationStatus, "SOURCE_DELETE_DRAFT_ONLY", "仅草稿来源可直接删除");
    }
}
