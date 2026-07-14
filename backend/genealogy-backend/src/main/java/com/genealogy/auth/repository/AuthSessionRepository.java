package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AuthSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AuthSessionRepository extends JpaRepository<AuthSessionEntity, Long> {

    Optional<AuthSessionEntity> findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(String tokenHash, LocalDateTime now);

    Optional<AuthSessionEntity> findByTokenHash(String tokenHash);

    List<AuthSessionEntity> findByUserIdAndRevokedAtIsNullAndExpiresAtAfterOrderByLastAccessAtDesc(
            Long userId,
            LocalDateTime now
    );

    @Modifying
    @Query("delete from AuthSessionEntity s where s.expiresAt < :cutoff or (s.revokedAt is not null and s.revokedAt < :cutoff)")
    int deleteRetiredBefore(@Param("cutoff") LocalDateTime cutoff);
}
