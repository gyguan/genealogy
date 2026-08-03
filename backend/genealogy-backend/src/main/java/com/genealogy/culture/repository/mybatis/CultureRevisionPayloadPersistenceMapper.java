package com.genealogy.culture.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.culture.entity.CultureRevisionPayloadEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CultureRevisionPayloadPersistenceMapper extends BaseMapper<CultureRevisionPayloadEntity> {
    int updateAllById(CultureRevisionPayloadEntity entity);
}
