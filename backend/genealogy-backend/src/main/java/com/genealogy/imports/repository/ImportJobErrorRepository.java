package com.genealogy.imports.repository;

import com.genealogy.imports.entity.ImportJobErrorEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ImportJobErrorRepository extends JpaRepository<ImportJobErrorEntity, Long> {

    List<ImportJobErrorEntity> findByJobIdOrderByRowNoAsc(Long jobId);

    Optional<ImportJobErrorEntity> findFirstByJobIdAndRowNo(Long jobId, Integer rowNo);

    void deleteByJobIdAndRowNo(Long jobId, Integer rowNo);
}
