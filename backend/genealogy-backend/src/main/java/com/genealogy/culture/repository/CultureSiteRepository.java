package com.genealogy.culture.repository;

import com.genealogy.culture.entity.CultureSiteEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CultureSiteRepository extends JpaRepository<CultureSiteEntity, Long> {

    Optional<CultureSiteEntity> findByIdAndDeletedAtIsNull(Long id);

    Page<CultureSiteEntity> findByClanIdAndDeletedAtIsNull(Long clanId, Pageable pageable);

    Page<CultureSiteEntity> findByClanIdAndBranchIdAndDeletedAtIsNull(
            Long clanId,
            Long branchId,
            Pageable pageable);

    List<CultureSiteEntity> findTop10ByClanIdAndDataStatusAndFeaturedOnHomeTrueAndDeletedAtIsNullOrderBySortOrderAscUpdatedAtDesc(
            Long clanId,
            String dataStatus);
}
