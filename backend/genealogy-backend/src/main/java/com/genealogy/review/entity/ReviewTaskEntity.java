package com.genealogy.review.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@TableName("review_task")
public class ReviewTaskEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long clanId;
    private Long revisionId;
    private UUID traceId;
    private Integer reviewLevel;
    private Long reviewerId;
    private String reviewerRole;
    private Long branchId;
    private String status;
    private String reviewComment;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
}
