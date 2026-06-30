package com.genealogy.imports.repository;

import com.genealogy.imports.entity.ImportJobErrorEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ImportJobErrorRepository extends JpaRepository<ImportJobErrorEntity, Long> {

    List<ImportJobErrorEntity> findByJobIdOrderByRowNoAsc(Long jobId);
}
