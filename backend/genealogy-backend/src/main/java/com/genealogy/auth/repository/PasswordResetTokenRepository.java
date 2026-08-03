package com.genealogy.auth.repository;

import com.genealogy.auth.entity.PasswordResetTokenEntity;
import com.genealogy.auth.repository.mybatis.PasswordResetTokenPersistenceMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@Transactional(readOnly = true)
public class PasswordResetTokenRepository {
    private final PasswordResetTokenPersistenceMapper mapper;

    public PasswordResetTokenRepository(
            PasswordResetTokenPersistenceMapper mapper
    ) {
        this.mapper = mapper;
    }

    @Transactional
    public PasswordResetTokenEntity save(PasswordResetTokenEntity entity) {
        Objects.requireNonNull(entity, "entity");
        if (entity.getId() == null) {
            if (entity.getCreatedAt() == null) {
                entity.setCreatedAt(LocalDateTime.now());
            }
            mapper.insert(entity);
        } else if (mapper.updateAllById(entity) != 1) {
            throw new IllegalStateException(
                    "Reset token update failed for id " + entity.getId()
            );
        }
        return entity;
    }

    @Transactional
    public PasswordResetTokenEntity saveAndFlush(
            PasswordResetTokenEntity entity
    ) {
        return save(entity);
    }

    public Optional<PasswordResetTokenEntity> findByTokenHash(
            String tokenHash
    ) {
        return Optional.ofNullable(mapper.findByTokenHash(tokenHash, false));
    }

    public Optional<PasswordResetTokenEntity> findForUpdateByTokenHash(
            String tokenHash
    ) {
        return Optional.ofNullable(mapper.findByTokenHash(tokenHash, true));
    }

    public List<PasswordResetTokenEntity>
            findByUserIdAndUsedAtIsNullAndRevokedAtIsNull(Long userId) {
        return mapper.findActiveByUserId(userId);
    }
}
