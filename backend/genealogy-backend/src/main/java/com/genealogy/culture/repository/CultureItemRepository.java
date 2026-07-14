package com.genealogy.culture.repository;

import com.genealogy.culture.entity.CultureItemEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface CultureItemRepository extends JpaRepository<CultureItemEntity, Long>, JpaSpecificationExecutor<CultureItemEntity> {

    Optional<CultureItemEntity> findByIdAndDeletedAtIsNull(Long id);

    Page<CultureItemEntity> findByClanIdAndDeletedAtIsNull(Long clanId, Pageable pageable);

    Page<CultureItemEntity> findByClanIdAndBranchIdAndDeletedAtIsNull(
            Long clanId,
            Long branchId,
            Pageable pageable);

    List<CultureItemEntity> findTop10ByClanIdAndDataStatusAndFeaturedOnHomeTrueAndDeletedAtIsNullOrderBySortOrderAscUpdatedAtDesc(
            Long clanId,
            String dataStatus);
}
