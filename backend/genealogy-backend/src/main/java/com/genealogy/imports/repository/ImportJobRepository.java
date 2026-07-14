package com.genealogy.imports.repository;

import com.genealogy.imports.entity.ImportJobEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ImportJobRepository extends JpaRepository<ImportJobEntity, Long>, JpaSpecificationExecutor<ImportJobEntity> {

    List<ImportJobEntity> findByClanIdOrderByCreatedAtDesc(Long clanId);

    Optional<ImportJobEntity> findByIdAndClanId(Long id, Long clanId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from ImportJobEntity job where job.id = :jobId and job.clanId = :clanId")
    Optional<ImportJobEntity> findByIdAndClanIdForUpdate(
            @Param("jobId") Long jobId,
            @Param("clanId") Long clanId
    );

    @Query(value = """
            select *
            from import_job
            where execution_mode = 'async'
              and execution_status in ('queued', 'running', 'retry_wait')
              and (next_retry_at is null or next_retry_at <= :now)
              and (lease_expires_at is null or lease_expires_at < :now)
            order by created_at asc, id asc
            limit 1
            for update skip locked
            """, nativeQuery = true)
    Optional<ImportJobEntity> findNextExecutableForUpdate(@Param("now") LocalDateTime now);
}
