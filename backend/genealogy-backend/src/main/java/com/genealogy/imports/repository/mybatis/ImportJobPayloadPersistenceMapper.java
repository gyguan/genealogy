package com.genealogy.imports.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.imports.entity.ImportJobPayloadEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ImportJobPayloadPersistenceMapper extends BaseMapper<ImportJobPayloadEntity> {
    int updateAllById(ImportJobPayloadEntity entity);
}
