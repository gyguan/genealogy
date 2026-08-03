package com.genealogy.auth.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.auth.entity.AppPermissionEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Collection;
import java.util.List;

@Mapper
public interface AppPermissionPersistenceMapper
        extends BaseMapper<AppPermissionEntity> {
    int updateAllById(@Param("entity") AppPermissionEntity entity);

    AppPermissionEntity findByPermissionCode(
            @Param("permissionCode") String permissionCode,
            @Param("status") String status
    );

    List<AppPermissionEntity> findByStatus(@Param("status") String status);

    List<AppPermissionEntity> findByModuleCodeAndStatus(
            @Param("moduleCode") String moduleCode,
            @Param("status") String status
    );

    List<AppPermissionEntity> findByPermissionCodesAndStatus(
            @Param("permissionCodes") Collection<String> permissionCodes,
            @Param("status") String status
    );

    boolean existsByPermissionCodeAndStatus(
            @Param("permissionCode") String permissionCode,
            @Param("status") String status
    );

    List<AppPermissionEntity> findAllByIds(
            @Param("ids") Collection<Long> ids
    );
}
