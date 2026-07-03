package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AppRolePermissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AppRolePermissionRepository extends JpaRepository<AppRolePermissionEntity, Long> {

    List<AppRolePermissionEntity> findByRoleIdAndStatus(Long roleId, String status);

    List<AppRolePermissionEntity> findByRoleIdInAndStatus(Collection<Long> roleIds, String status);

    Optional<AppRolePermissionEntity> findByRoleIdAndPermissionIdAndStatus(Long roleId, Long permissionId, String status);

    boolean existsByRoleIdAndPermissionIdAndEffectAndStatus(Long roleId, Long permissionId, String effect, String status);
}
