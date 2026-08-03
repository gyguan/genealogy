package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AuthSecurityEventEntity;
import com.genealogy.auth.repository.mybatis.AuthSecurityEventPersistenceMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;

@Repository
@Transactional(readOnly = true)
public class AuthSecurityEventRepository {
    private final AuthSecurityEventPersistenceMapper mapper;

    public AuthSecurityEventRepository(
            AuthSecurityEventPersistenceMapper mapper
    ) {
        this.mapper = mapper;
    }

    @Transactional
    public AuthSecurityEventEntity save(AuthSecurityEventEntity entity) {
        Objects.requireNonNull(entity, "entity");
        if (entity.getId() == null) {
            if (entity.getCreatedAt() == null) {
                entity.setCreatedAt(LocalDateTime.now());
            }
            mapper.insert(entity);
        } else if (mapper.updateAllById(entity) != 1) {
            throw new IllegalStateException(
                    "Security event update failed for id " + entity.getId()
            );
        }
        return entity;
    }
}
