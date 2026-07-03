package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AppPermissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AppPermissionRepository extends JpaRepository<AppPermissionEntity, Long> {

    Optional<AppPermissionEntity> findByPermissionCode(String permissionCode);

    Optional<AppPermissionEntity> findByPermissionCodeAndStatus(String permissionCode, String status);

    List<AppPermissionEntity> findByStatus(String status);

    List<AppPermissionEntity> findByModuleCodeAndStatus(String moduleCode, String status);

    List<AppPermissionEntity> findByPermissionCodeInAndStatus(Collection<String> permissionCodes, String status);

    boolean existsByPermissionCodeAndStatus(String permissionCode, String status);
}
