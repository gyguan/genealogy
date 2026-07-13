package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AuthLoginAttemptEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface AuthLoginAttemptRepository extends JpaRepository<AuthLoginAttemptEntity, Long> {
    long countByAccountHashAndSuccessFalseAndCreatedAtAfter(String accountHash, LocalDateTime createdAt);
    long countByIpHashAndSuccessFalseAndCreatedAtAfter(String ipHash, LocalDateTime createdAt);
    long deleteByAccountHashAndSuccessFalse(String accountHash);
}
