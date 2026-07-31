package com.genealogy.culture.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.culture.entity.CultureItemEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CultureItemPersistenceMapper extends BaseMapper<CultureItemEntity> {
    int updateAllByIdAndVersion(CultureItemEntity entity);
}
