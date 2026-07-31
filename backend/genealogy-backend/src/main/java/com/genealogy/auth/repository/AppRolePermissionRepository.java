package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AppRolePermissionEntity;
import com.genealogy.auth.repository.mybatis.AppRolePermissionPersistenceMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@Transactional(readOnly = true)
public class AppRolePermissionRepository {
    private final AppRolePermissionPersistenceMapper mapper;

    public AppRolePermissionRepository(
            AppRolePermissionPersistenceMapper mapper
    ) {
        this.mapper = mapper;
    }

    @Transactional
    public AppRolePermissionEntity save(AppRolePermissionEntity entity) {
        Objects.requireNonNull(entity, "entity");
        LocalDateTime now = LocalDateTime.now();
        if (entity.getId() == null) {
            if (entity.getCreatedAt() == null) {
                entity.setCreatedAt(now);
            }
            if (entity.getUpdatedAt() == null) {
                entity.setUpdatedAt(now);
            }
            mapper.insert(entity);
        } else {
            entity.setUpdatedAt(now);
            if (mapper.updateAllById(entity) != 1) {
                throw new IllegalStateException(
                        "Role permission update failed for id " + entity.getId()
                );
            }
        }
        return entity;
    }

    @Transactional
    public List<AppRolePermissionEntity> saveAll(
            Collection<AppRolePermissionEntity> entities
    ) {
        return entities.stream().map(this::save).toList();
    }

    public List<AppRolePermissionEntity> findByRoleIdAndStatus(
            Long roleId,
            String status
    ) {
        return mapper.findByRoleIdAndStatus(roleId, status);
    }

    public List<AppRolePermissionEntity> findByRoleIdInAndStatus(
            Collection<Long> roleIds,
            String status
    ) {
        return roleIds == null || roleIds.isEmpty()
                ? List.of()
                : mapper.findByRoleIdsAndStatus(roleIds, status);
    }

    public Optional<AppRolePermissionEntity>
            findByRoleIdAndPermissionIdAndStatus(
                    Long roleId,
                    Long permissionId,
                    String status
            ) {
        return Optional.ofNullable(
                mapper.findMapping(roleId, permissionId, null, status)
        );
    }

    public boolean existsByRoleIdAndPermissionIdAndEffectAndStatus(
            Long roleId,
            Long permissionId,
            String effect,
            String status
    ) {
        return mapper.findMapping(roleId, permissionId, effect, status) != null;
    }
}
