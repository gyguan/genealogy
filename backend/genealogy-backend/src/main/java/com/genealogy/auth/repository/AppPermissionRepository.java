package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AppPermissionEntity;
import com.genealogy.auth.repository.mybatis.AppPermissionPersistenceMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@Transactional(readOnly = true)
public class AppPermissionRepository {
    private final AppPermissionPersistenceMapper mapper;

    public AppPermissionRepository(AppPermissionPersistenceMapper mapper) {
        this.mapper = mapper;
    }

    @Transactional
    public AppPermissionEntity save(AppPermissionEntity entity) {
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
            requireUpdated(mapper.updateAllById(entity), entity.getId());
        }
        return entity;
    }

    @Transactional
    public AppPermissionEntity saveAndFlush(AppPermissionEntity entity) {
        return save(entity);
    }

    @Transactional
    public List<AppPermissionEntity> saveAll(
            Collection<AppPermissionEntity> entities
    ) {
        return entities.stream().map(this::save).toList();
    }

    public Optional<AppPermissionEntity> findById(Long id) {
        return Optional.ofNullable(id == null ? null : mapper.selectById(id));
    }

    public List<AppPermissionEntity> findAllById(Iterable<Long> ids) {
        List<Long> values = toList(ids);
        return values.isEmpty() ? List.of() : mapper.findAllByIds(values);
    }

    public Optional<AppPermissionEntity> findByPermissionCode(
            String permissionCode
    ) {
        return Optional.ofNullable(
                mapper.findByPermissionCode(permissionCode, null)
        );
    }

    public Optional<AppPermissionEntity> findByPermissionCodeAndStatus(
            String permissionCode,
            String status
    ) {
        return Optional.ofNullable(
                mapper.findByPermissionCode(permissionCode, status)
        );
    }

    public List<AppPermissionEntity> findByStatus(String status) {
        return mapper.findByStatus(status);
    }

    public List<AppPermissionEntity> findByModuleCodeAndStatus(
            String moduleCode,
            String status
    ) {
        return mapper.findByModuleCodeAndStatus(moduleCode, status);
    }

    public List<AppPermissionEntity> findByPermissionCodeInAndStatus(
            Collection<String> permissionCodes,
            String status
    ) {
        return permissionCodes == null || permissionCodes.isEmpty()
                ? List.of()
                : mapper.findByPermissionCodesAndStatus(permissionCodes, status);
    }

    public boolean existsByPermissionCodeAndStatus(
            String permissionCode,
            String status
    ) {
        return mapper.existsByPermissionCodeAndStatus(permissionCode, status);
    }

    private void requireUpdated(int updated, Long id) {
        if (updated != 1) {
            throw new IllegalStateException(
                    "Permission update failed for id " + id
            );
        }
    }

    private List<Long> toList(Iterable<Long> ids) {
        if (ids == null) {
            return List.of();
        }
        List<Long> values = new ArrayList<>();
        ids.forEach(values::add);
        return values;
    }
}
