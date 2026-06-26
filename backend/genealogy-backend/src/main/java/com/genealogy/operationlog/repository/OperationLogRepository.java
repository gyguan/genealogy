package com.genealogy.operationlog.repository;

import com.genealogy.operationlog.entity.OperationLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OperationLogRepository extends JpaRepository<OperationLogEntity, Long> {

    Page<OperationLogEntity> findByClanId(Long clanId, Pageable pageable);

    Page<OperationLogEntity> findByTargetTypeAndTargetId(String targetType, Long targetId, Pageable pageable);
}
