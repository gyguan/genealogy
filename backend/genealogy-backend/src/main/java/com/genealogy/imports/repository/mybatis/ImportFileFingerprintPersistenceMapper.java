package com.genealogy.imports.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.imports.entity.ImportFileFingerprintEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ImportFileFingerprintPersistenceMapper extends BaseMapper<ImportFileFingerprintEntity> {
    ImportFileFingerprintEntity findExisting(@Param("clanId") Long clanId, @Param("branchId") Long branchId, @Param("importType") String importType, @Param("fileHash") String fileHash);
    int updateAllById(ImportFileFingerprintEntity entity);
}
