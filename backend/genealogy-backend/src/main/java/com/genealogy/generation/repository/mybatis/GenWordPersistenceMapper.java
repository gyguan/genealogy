package com.genealogy.generation.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.generation.entity.GenerationWordEntity;
import org.apache.ibatis.annotations.Mapper;

/** MyBatis persistence mapper hidden behind {@code GenWordRepository}. */
@Mapper
public interface GenWordPersistenceMapper extends BaseMapper<GenerationWordEntity> {

    int updateAllById(GenerationWordEntity entity);
}
