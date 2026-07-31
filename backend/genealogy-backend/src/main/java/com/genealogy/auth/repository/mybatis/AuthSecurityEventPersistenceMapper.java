package com.genealogy.auth.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.auth.entity.AuthSecurityEventEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AuthSecurityEventPersistenceMapper
        extends BaseMapper<AuthSecurityEventEntity> {
    int updateAllById(@Param("entity") AuthSecurityEventEntity entity);
}
