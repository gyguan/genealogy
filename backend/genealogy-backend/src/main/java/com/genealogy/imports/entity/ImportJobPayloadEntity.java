package com.genealogy.imports.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName(value = "import_job_payload")
public class ImportJobPayloadEntity {

    @TableId
    private Long jobId;
    private String originalFilename;
    private String contentType;
    private byte[] fileContent;
    private Boolean confirmDuplicates;
    private LocalDateTime createdAt;
}
