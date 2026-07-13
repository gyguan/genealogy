package com.genealogy.auth.repository;

import com.genealogy.auth.entity.PasswordResetTokenEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, Long> {
    Optional<PasswordResetTokenEntity> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select token from PasswordResetTokenEntity token where token.tokenHash = :tokenHash")
    Optional<PasswordResetTokenEntity> findForUpdateByTokenHash(@Param("tokenHash") String tokenHash);

    List<PasswordResetTokenEntity> findByUserIdAndUsedAtIsNullAndRevokedAtIsNull(Long userId);
}
