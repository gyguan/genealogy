package com.genealogy.culture.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("culture_revision_payload")
public class CultureRevisionPayloadEntity {

    @TableId(type = IdType.INPUT)
    private Long revisionId;

    private String payloadJson;

    private LocalDateTime createdAt;
}
