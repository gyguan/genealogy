package com.genealogy.imports.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.imports.entity.ImportJobEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import com.genealogy.imports.repository.query.ImportJobQueryCriteria;

@Mapper
public interface ImportJobPersistenceMapper extends BaseMapper<ImportJobEntity> {
    List<ImportJobEntity> findByClanId(@Param("clanId") Long clanId);
    ImportJobEntity findByIdAndClanId(@Param("id") Long id, @Param("clanId") Long clanId);
    ImportJobEntity findByIdAndClanIdForUpdate(@Param("id") Long id, @Param("clanId") Long clanId);
    ImportJobEntity findFirstByIdempotencyKey(@Param("clanId") Long clanId, @Param("idempotencyKey") String idempotencyKey);
    ImportJobEntity findNextExecutableForUpdate(@Param("now") LocalDateTime now);
    List<ImportJobEntity> search(@Param("criteria") ImportJobQueryCriteria criteria, @Param("offset") long offset, @Param("limit") int limit);
    long countSearch(@Param("criteria") ImportJobQueryCriteria criteria);
    List<ImportJobEntity> findAllByIds(@Param("ids") Collection<Long> ids);
    int updateAllById(ImportJobEntity entity);
}
