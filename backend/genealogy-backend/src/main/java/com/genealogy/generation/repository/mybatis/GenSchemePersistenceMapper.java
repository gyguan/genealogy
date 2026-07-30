package com.genealogy.generation.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import org.apache.ibatis.annotations.Mapper;

/** MyBatis persistence mapper hidden behind {@code GenSchemeRepository}. */
@Mapper
public interface GenSchemePersistenceMapper extends BaseMapper<GenerationSchemeEntity> {

    int updateAllById(GenerationSchemeEntity entity);
}
