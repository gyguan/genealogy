package com.genealogy.auth.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.auth.entity.AppRolePermissionEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Collection;
import java.util.List;

@Mapper
public interface AppRolePermissionPersistenceMapper
        extends BaseMapper<AppRolePermissionEntity> {
    int updateAllById(@Param("entity") AppRolePermissionEntity entity);

    List<AppRolePermissionEntity> findByRoleIdAndStatus(
            @Param("roleId") Long roleId,
            @Param("status") String status
    );

    List<AppRolePermissionEntity> findByRoleIdsAndStatus(
            @Param("roleIds") Collection<Long> roleIds,
            @Param("status") String status
    );

    AppRolePermissionEntity findMapping(
            @Param("roleId") Long roleId,
            @Param("permissionId") Long permissionId,
            @Param("effect") String effect,
            @Param("status") String status
    );
}
