package com.genealogy.imports.repository;

import com.genealogy.imports.entity.ImportJobRowEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ImportJobRowRepository extends JpaRepository<ImportJobRowEntity, Long> {

    Page<ImportJobRowEntity> findByJobIdOrderByRowNoAsc(Long jobId, Pageable pageable);

    Page<ImportJobRowEntity> findByJobIdAndRowStatusOrderByRowNoAsc(Long jobId, String rowStatus, Pageable pageable);

    Optional<ImportJobRowEntity> findByIdAndJobId(Long id, Long jobId);

    Optional<ImportJobRowEntity> findByJobIdAndRowNo(Long jobId, Integer rowNo);

    long countByJobIdAndRowStatus(Long jobId, String rowStatus);
}
