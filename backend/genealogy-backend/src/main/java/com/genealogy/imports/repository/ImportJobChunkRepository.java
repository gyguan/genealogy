package com.genealogy.imports.repository;

import com.genealogy.imports.entity.ImportJobChunkEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ImportJobChunkRepository extends JpaRepository<ImportJobChunkEntity, Long> {

    Optional<ImportJobChunkEntity> findByJobIdAndStageAndChunkNo(Long jobId, String stage, Integer chunkNo);
}
