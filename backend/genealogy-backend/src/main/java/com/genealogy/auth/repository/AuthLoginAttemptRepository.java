package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AuthLoginAttemptEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface AuthLoginAttemptRepository extends JpaRepository<AuthLoginAttemptEntity, Long> {
    long countByAccountHashAndSuccessFalseAndCreatedAtAfter(String accountHash, LocalDateTime createdAt);
    long countByIpHashAndSuccessFalseAndCreatedAtAfter(String ipHash, LocalDateTime createdAt);
    Optional<AuthLoginAttemptEntity> findTopByAccountHashAndSuccessFalseOrderByCreatedAtDesc(String accountHash);
    Optional<AuthLoginAttemptEntity> findTopByIpHashAndSuccessFalseOrderByCreatedAtDesc(String ipHash);
    long deleteByAccountHashAndSuccessFalse(String accountHash);
}
