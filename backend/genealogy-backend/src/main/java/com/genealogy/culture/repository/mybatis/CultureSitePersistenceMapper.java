package com.genealogy.culture.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.culture.entity.CultureSiteEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CultureSitePersistenceMapper extends BaseMapper<CultureSiteEntity> {
    int updateAllByIdAndVersion(CultureSiteEntity entity);
}
