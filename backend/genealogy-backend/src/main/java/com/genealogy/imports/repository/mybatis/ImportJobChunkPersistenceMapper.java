package com.genealogy.imports.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.imports.entity.ImportJobChunkEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ImportJobChunkPersistenceMapper extends BaseMapper<ImportJobChunkEntity> {
    ImportJobChunkEntity findByJobStageChunk(@Param("jobId") Long jobId, @Param("stage") String stage, @Param("chunkNo") Integer chunkNo);
    int updateWithVersion(ImportJobChunkEntity entity);
}
