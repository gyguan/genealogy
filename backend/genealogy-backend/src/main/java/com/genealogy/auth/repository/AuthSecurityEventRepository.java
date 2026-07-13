package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AuthSecurityEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthSecurityEventRepository extends JpaRepository<AuthSecurityEventEntity, Long> {
}
