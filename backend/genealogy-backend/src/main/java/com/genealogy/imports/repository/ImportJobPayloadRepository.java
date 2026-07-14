package com.genealogy.imports.repository;

import com.genealogy.imports.entity.ImportJobPayloadEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImportJobPayloadRepository extends JpaRepository<ImportJobPayloadEntity, Long> {
}
