package com.genealogy.review.repository;

import com.genealogy.review.entity.AuditRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditRecordRepository extends JpaRepository<AuditRecordEntity, Long> {
}
