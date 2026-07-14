package com.genealogy.culture.repository;

import com.genealogy.culture.entity.MigrationEventEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MigrationEventRepository extends JpaRepository<MigrationEventEntity, Long> {

    Optional<MigrationEventEntity> findByIdAndDeletedAtIsNull(Long id);

    Page<MigrationEventEntity> findByClanIdAndDeletedAtIsNull(Long clanId, Pageable pageable);

    List<MigrationEventEntity> findByClanIdAndBranchIdAndDeletedAtIsNullOrderBySequenceNoAsc(
            Long clanId,
            Long branchId);

    boolean existsByClanIdAndBranchIdAndSequenceNoAndDeletedAtIsNull(
            Long clanId,
            Long branchId,
            Integer sequenceNo);
}
