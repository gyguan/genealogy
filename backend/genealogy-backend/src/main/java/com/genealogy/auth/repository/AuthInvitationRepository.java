package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AuthInvitationEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AuthInvitationRepository extends JpaRepository<AuthInvitationEntity, Long> {
    Optional<AuthInvitationEntity> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select invitation from AuthInvitationEntity invitation where invitation.tokenHash = :tokenHash")
    Optional<AuthInvitationEntity> findForUpdateByTokenHash(@Param("tokenHash") String tokenHash);
}
