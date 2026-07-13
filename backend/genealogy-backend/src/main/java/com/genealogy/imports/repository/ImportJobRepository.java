package com.genealogy.imports.repository;

import com.genealogy.imports.entity.ImportJobEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface ImportJobRepository extends JpaRepository<ImportJobEntity, Long>, JpaSpecificationExecutor<ImportJobEntity> {

    List<ImportJobEntity> findByClanIdOrderByCreatedAtDesc(Long clanId);

    Optional<ImportJobEntity> findByIdAndClanId(Long id, Long clanId);
}
