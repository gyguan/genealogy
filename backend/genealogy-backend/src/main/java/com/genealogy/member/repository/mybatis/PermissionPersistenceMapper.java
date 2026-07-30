package com.genealogy.member.repository.mybatis;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.member.entity.PermissionEntity;
import org.apache.ibatis.annotations.Mapper;
@Mapper public interface PermissionPersistenceMapper extends BaseMapper<PermissionEntity> { int updateAllById(PermissionEntity entity); }
