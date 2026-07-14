package com.genealogy.imports.repository;

import com.genealogy.imports.entity.ImportJobRowEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ImportJobRowRepository extends JpaRepository<ImportJobRowEntity, Long> {

    Page<ImportJobRowEntity> findByJobIdOrderByRowNoAsc(Long jobId, Pageable pageable);

    Page<ImportJobRowEntity> findByJobIdAndRowStatusOrderByRowNoAsc(Long jobId, String rowStatus, Pageable pageable);

    Page<ImportJobRowEntity> findByJobIdAndRowStatusInOrderByRowNoAsc(
            Long jobId,
            Collection<String> rowStatuses,
            Pageable pageable
    );

    List<ImportJobRowEntity> findByJobIdAndRowStatusOrderByRowNoAsc(Long jobId, String rowStatus);

    List<ImportJobRowEntity> findByJobIdAndRowStatusInOrderByRowNoAsc(
            Long jobId,
            Collection<String> rowStatuses
    );

    List<ImportJobRowEntity> findByJobIdAndRowNoInOrderByRowNoAsc(
            Long jobId,
            Collection<Integer> rowNos
    );

    List<ImportJobRowEntity> findByJobIdAndRowStatusAndPublishedAtIsNullOrderByRowNoAsc(
            Long jobId,
            String rowStatus,
            Pageable pageable
    );

    Optional<ImportJobRowEntity> findByIdAndJobId(Long id, Long jobId);

    Optional<ImportJobRowEntity> findByJobIdAndRowNo(Long jobId, Integer rowNo);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select row from ImportJobRowEntity row where row.jobId = :jobId and row.rowNo = :rowNo")
    Optional<ImportJobRowEntity> findByJobIdAndRowNoForUpdate(
            @Param("jobId") Long jobId,
            @Param("rowNo") Integer rowNo
    );

    long countByJobId(Long jobId);

    long countByJobIdAndRowStatus(Long jobId, String rowStatus);

    long countByJobIdAndRowStatusIn(Long jobId, Collection<String> rowStatuses);

    long countByJobIdAndRowStatusAndPublishedAtIsNull(Long jobId, String rowStatus);
}
