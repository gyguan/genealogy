package com.genealogy.imports.repository;

import com.genealogy.imports.entity.ImportJobEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ImportJobRepository extends JpaRepository<ImportJobEntity, Long> {

    List<ImportJobEntity> findByClanIdOrderByCreatedAtDesc(Long clanId);
}
