package com.genealogy.person.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.person.entity.PersonEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PersonPersistenceMapper extends BaseMapper<PersonEntity> {

    int updateAllById(PersonEntity entity);

    PersonEntity selectActiveByIdForUpdate(@Param("personId") Long personId);

    int updateAllBatch(@Param("items") List<PersonEntity> items);
}
