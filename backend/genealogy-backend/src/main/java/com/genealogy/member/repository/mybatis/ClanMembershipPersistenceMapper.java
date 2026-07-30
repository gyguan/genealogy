package com.genealogy.member.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.member.entity.ClanMembershipEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ClanMembershipPersistenceMapper extends BaseMapper<ClanMembershipEntity> {
    int updateAllById(ClanMembershipEntity entity);
    List<ClanMembershipEntity> selectByClanIdForUpdate(@Param("clanId") Long clanId);
}
