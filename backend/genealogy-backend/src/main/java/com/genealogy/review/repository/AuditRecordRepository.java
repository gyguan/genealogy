package com.genealogy.review.repository;

import com.genealogy.review.entity.AuditRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditRecordRepository extends JpaRepository<AuditRecordEntity, Long> {

    boolean existsByTargetTypeAndTargetIdAndStatus(String targetType, Long targetId, String status);

    List<AuditRecordEntity> findByTargetTypeAndTargetIdOrderBySubmitTimeDesc(String targetType, Long targetId);
}
