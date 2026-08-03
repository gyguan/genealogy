package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AuthLoginAttemptEntity;
import com.genealogy.auth.repository.mybatis.AuthLoginAttemptPersistenceMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;

@Repository
@Transactional(readOnly = true)
public class AuthLoginAttemptRepository {
    private final AuthLoginAttemptPersistenceMapper mapper;

    public AuthLoginAttemptRepository(
            AuthLoginAttemptPersistenceMapper mapper
    ) {
        this.mapper = mapper;
    }

    @Transactional
    public AuthLoginAttemptEntity save(AuthLoginAttemptEntity entity) {
        Objects.requireNonNull(entity, "entity");
        if (entity.getId() == null) {
            if (entity.getCreatedAt() == null) {
                entity.setCreatedAt(LocalDateTime.now());
            }
            mapper.insert(entity);
        } else if (mapper.updateAllById(entity) != 1) {
            throw new IllegalStateException(
                    "Login attempt update failed for id " + entity.getId()
            );
        }
        return entity;
    }

    public long countByAccountHashAndSuccessFalseAndCreatedAtAfter(
            String accountHash,
            LocalDateTime createdAt
    ) {
        return mapper.countAccountFailures(accountHash, createdAt);
    }

    public long countByIpHashAndSuccessFalseAndCreatedAtAfter(
            String ipHash,
            LocalDateTime createdAt
    ) {
        return mapper.countIpFailures(ipHash, createdAt);
    }

    public Optional<AuthLoginAttemptEntity>
            findTopByAccountHashAndSuccessFalseOrderByCreatedAtDesc(
                    String accountHash
            ) {
        return Optional.ofNullable(
                mapper.findLatestAccountFailure(accountHash)
        );
    }

    public Optional<AuthLoginAttemptEntity>
            findTopByIpHashAndSuccessFalseOrderByCreatedAtDesc(
                    String ipHash
            ) {
        return Optional.ofNullable(mapper.findLatestIpFailure(ipHash));
    }

    @Transactional
    public long deleteByAccountHashAndSuccessFalse(String accountHash) {
        return mapper.deleteAccountFailures(accountHash);
    }
}
