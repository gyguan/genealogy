package com.genealogy.imports.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.imports.entity.ImportJobErrorEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface ImportJobErrorPersistenceMapper extends BaseMapper<ImportJobErrorEntity> {
    List<ImportJobErrorEntity> findByJobId(@Param("jobId") Long jobId);
    ImportJobErrorEntity findFirstByJobIdAndRowNo(@Param("jobId") Long jobId, @Param("rowNo") Integer rowNo);
    int deleteByJobIdAndRowNo(@Param("jobId") Long jobId, @Param("rowNo") Integer rowNo);
    int updateAllById(ImportJobErrorEntity entity);
}
