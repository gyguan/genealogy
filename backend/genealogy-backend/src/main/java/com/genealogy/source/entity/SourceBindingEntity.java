package com.genealogy.source.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("source_binding")
public class SourceBindingEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long clanId;
    private Long sourceId;
    private String targetType;
    private Long targetId;
    private String bindingReason;
    private String excerpt;
    private String confidenceLevel;
    private String bindingStatus;
    private Long createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
