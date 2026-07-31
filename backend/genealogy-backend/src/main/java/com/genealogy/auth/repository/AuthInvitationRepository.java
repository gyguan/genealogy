package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AuthInvitationEntity;
import com.genealogy.auth.repository.mybatis.AuthInvitationPersistenceMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;

@Repository
@Transactional(readOnly = true)
public class AuthInvitationRepository {
    private final AuthInvitationPersistenceMapper mapper;

    public AuthInvitationRepository(AuthInvitationPersistenceMapper mapper) {
        this.mapper = mapper;
    }

    @Transactional
    public AuthInvitationEntity save(AuthInvitationEntity entity) {
        Objects.requireNonNull(entity, "entity");
        if (entity.getId() == null) {
            if (entity.getCreatedAt() == null) {
                entity.setCreatedAt(LocalDateTime.now());
            }
            mapper.insert(entity);
        } else if (mapper.updateAllById(entity) != 1) {
            throw new IllegalStateException(
                    "Invitation update failed for id " + entity.getId()
            );
        }
        return entity;
    }

    @Transactional
    public AuthInvitationEntity saveAndFlush(AuthInvitationEntity entity) {
        return save(entity);
    }

    public Optional<AuthInvitationEntity> findByTokenHash(String tokenHash) {
        return Optional.ofNullable(mapper.findByTokenHash(tokenHash, false));
    }

    public Optional<AuthInvitationEntity> findForUpdateByTokenHash(
            String tokenHash
    ) {
        return Optional.ofNullable(mapper.findByTokenHash(tokenHash, true));
    }
}
