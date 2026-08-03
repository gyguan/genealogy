package com.genealogy.culture.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.culture.entity.MigrationEventEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MigrationEventPersistenceMapper extends BaseMapper<MigrationEventEntity> {
    int updateAllByIdAndVersion(MigrationEventEntity entity);
}
