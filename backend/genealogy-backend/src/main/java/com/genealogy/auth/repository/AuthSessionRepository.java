package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AuthSessionEntity;
import com.genealogy.auth.repository.mybatis.AuthSessionPersistenceMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@Transactional(readOnly = true)
public class AuthSessionRepository {
    private final AuthSessionPersistenceMapper mapper;

    public AuthSessionRepository(AuthSessionPersistenceMapper mapper) {
        this.mapper = mapper;
    }

    @Transactional
    public AuthSessionEntity save(AuthSessionEntity entity) {
        Objects.requireNonNull(entity, "entity");
        if (entity.getId() == null) {
            mapper.insert(entity);
        } else if (mapper.updateAllById(entity) != 1) {
            throw new IllegalStateException(
                    "Session update failed for id " + entity.getId()
            );
        }
        return entity;
    }

    @Transactional
    public AuthSessionEntity saveAndFlush(AuthSessionEntity entity) {
        return save(entity);
    }

    @Transactional
    public List<AuthSessionEntity> saveAll(
            Collection<AuthSessionEntity> entities
    ) {
        return entities.stream().map(this::save).toList();
    }

    public Optional<AuthSessionEntity> findById(Long id) {
        return Optional.ofNullable(id == null ? null : mapper.selectById(id));
    }

    public Optional<AuthSessionEntity>
            findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(
                    String tokenHash,
                    LocalDateTime now
            ) {
        return Optional.ofNullable(
                mapper.findActiveByTokenHash(tokenHash, now)
        );
    }

    public Optional<AuthSessionEntity> findByTokenHash(String tokenHash) {
        return Optional.ofNullable(mapper.findByTokenHash(tokenHash));
    }

    public List<AuthSessionEntity>
            findByUserIdAndRevokedAtIsNullAndExpiresAtAfterOrderByLastAccessAtDesc(
                    Long userId,
                    LocalDateTime now
            ) {
        return mapper.findActiveByUserId(userId, now);
    }

    @Transactional
    public int deleteRetiredBefore(LocalDateTime cutoff) {
        return mapper.deleteRetiredBefore(cutoff);
    }
}
