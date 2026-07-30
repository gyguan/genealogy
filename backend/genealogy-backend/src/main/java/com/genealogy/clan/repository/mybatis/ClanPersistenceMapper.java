package com.genealogy.clan.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.clan.entity.ClanEntity;
import org.apache.ibatis.annotations.Mapper;

/** MyBatis persistence mapper hidden behind {@code ClanRepository}. */
@Mapper
public interface ClanPersistenceMapper extends BaseMapper<ClanEntity> {

    /**
     * Updates every mutable column, including explicit null values.
     * This is required for snapshot replacement and nullable field clearing.
     */
    int updateAllById(ClanEntity entity);
}
