package com.genealogy.person.event.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.person.event.entity.PersonEventEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface PersonEventPersistenceMapper extends BaseMapper<PersonEventEntity> {
}
