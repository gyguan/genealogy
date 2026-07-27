package com.genealogy.imports.repository;

import com.genealogy.imports.entity.ImportFileFingerprintEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ImportFileFingerprintRepository extends JpaRepository<ImportFileFingerprintEntity, Long> {

    Optional<ImportFileFingerprintEntity> findByClanIdAndBranchIdAndImportTypeAndFileHash(
            Long clanId,
            Long branchId,
            String importType,
            String fileHash
    );
}
