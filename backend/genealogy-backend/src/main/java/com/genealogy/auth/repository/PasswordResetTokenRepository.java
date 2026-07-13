package com.genealogy.auth.repository;

import com.genealogy.auth.entity.PasswordResetTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, Long> {
    Optional<PasswordResetTokenEntity> findByTokenHash(String tokenHash);
    List<PasswordResetTokenEntity> findByUserIdAndUsedAtIsNullAndRevokedAtIsNull(Long userId);
}
