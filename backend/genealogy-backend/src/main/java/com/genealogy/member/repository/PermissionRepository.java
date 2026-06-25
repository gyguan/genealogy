package com.genealogy.member.repository;

import com.genealogy.member.entity.PermissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PermissionRepository extends JpaRepository<PermissionEntity, Long> {

    Optional<PermissionEntity> findByPermissionCode(String permissionCode);
}
