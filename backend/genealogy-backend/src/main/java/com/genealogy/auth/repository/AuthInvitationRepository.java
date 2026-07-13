package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AuthInvitationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AuthInvitationRepository extends JpaRepository<AuthInvitationEntity, Long> {
    Optional<AuthInvitationEntity> findByTokenHash(String tokenHash);
}
