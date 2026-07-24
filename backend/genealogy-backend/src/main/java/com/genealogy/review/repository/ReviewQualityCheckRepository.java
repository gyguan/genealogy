package com.genealogy.review.repository;

import com.genealogy.review.entity.ReviewQualityCheckEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReviewQualityCheckRepository extends JpaRepository<ReviewQualityCheckEntity, UUID> {

    Optional<ReviewQualityCheckEntity> findByIdAndClanId(UUID id, Long clanId);

    boolean existsByClanIdAndScopeFingerprintAndStatusIn(Long clanId, String scopeFingerprint, Collection<String> statuses);

    List<ReviewQualityCheckEntity> findByClanIdOrderByQueuedAtDesc(Long clanId);
}
