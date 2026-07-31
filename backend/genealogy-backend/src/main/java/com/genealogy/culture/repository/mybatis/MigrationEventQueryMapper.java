package com.genealogy.culture.repository.mybatis;

import com.genealogy.culture.entity.MigrationEventEntity;
import com.genealogy.culture.repository.query.MigrationEventSearchRow;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MigrationEventQueryMapper {
    List<MigrationEventEntity> search(@Param("criteria") MigrationEventSearchRow criteria, @Param("offset") long offset, @Param("limit") int limit);
    long count(@Param("criteria") MigrationEventSearchRow criteria);
    boolean existsSequence(Long clanId, Long branchId, Integer sequenceNo, Long excludedId);
}
