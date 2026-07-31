package com.genealogy.relationship.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.relationship.entity.RelationshipEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface RelationshipPersistenceMapper extends BaseMapper<RelationshipEntity> {

    int updateAllById(RelationshipEntity entity);
}
