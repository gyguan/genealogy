package com.genealogy.imports.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName(value = "import_file_fingerprint")
public class ImportFileFingerprintEntity {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long clanId;
    private Long branchId;
    private String importType;
    private String fileHash;
    private Long jobId;
    private LocalDateTime createdAt;
}
