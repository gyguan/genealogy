package com.genealogy.member.repository.mybatis;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.member.entity.RoleEntity;
import org.apache.ibatis.annotations.Mapper;
@Mapper public interface RolePersistenceMapper extends BaseMapper<RoleEntity> { int updateAllById(RoleEntity entity); }
