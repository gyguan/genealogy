package com.genealogy.operationlog.repository;

import com.genealogy.operationlog.entity.OperationLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface OperationLogRepository extends JpaRepository<OperationLogEntity, Long> {

    Page<OperationLogEntity> findByClanId(Long clanId, Pageable pageable);

    Page<OperationLogEntity> findByTargetTypeAndTargetId(String targetType, Long targetId, Pageable pageable);

    @Query("""
            select log from OperationLogEntity log
            where (:clanId is null or log.clanId = :clanId)
              and (:actorId is null or log.actorId = :actorId)
              and (:actionType is null or log.actionType = :actionType)
              and (:targetType is null or log.targetType = :targetType)
              and (:targetId is null or log.targetId = :targetId)
              and (:startTime is null or log.createdAt >= :startTime)
              and (:endTime is null or log.createdAt <= :endTime)
              and (:keyword is null or lower(coalesce(log.summary, '')) like lower(concat('%', :keyword, '%')) or lower(coalesce(log.detail, '')) like lower(concat('%', :keyword, '%')))
            """)
    Page<OperationLogEntity> search(
            @Param("clanId") Long clanId,
            @Param("actorId") Long actorId,
            @Param("actionType") String actionType,
            @Param("targetType") String targetType,
            @Param("targetId") Long targetId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
