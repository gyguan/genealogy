package com.genealogy.imports.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName(value = "import_job_error")
public class ImportJobErrorEntity {

    @TableId(type = IdType.AUTO)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long jobId;

    private Integer rowNo;
    private String errorMessage;
    private String rawData;

    private LocalDateTime createdAt;
}
