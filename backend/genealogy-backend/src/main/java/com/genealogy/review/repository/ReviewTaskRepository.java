package com.genealogy.review.repository;

import com.genealogy.review.entity.ReviewTaskEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface ReviewTaskRepository extends JpaRepository<ReviewTaskEntity, Long> {

    Optional<ReviewTaskEntity> findFirstByRevisionIdOrderByReviewLevelAsc(Long revisionId);

    List<ReviewTaskEntity> findByTraceIdOrderByCreatedAtAscIdAsc(UUID traceId);

    Page<ReviewTaskEntity> findByClanIdAndRevisionIdInOrderByCreatedAtDesc(
            Long clanId,
            Collection<Long> revisionIds,
            Pageable pageable
    );

    Page<ReviewTaskEntity> findByClanIdAndRevisionIdInAndBranchIdInOrderByCreatedAtDesc(
            Long clanId,
            Collection<Long> revisionIds,
            Collection<Long> branchIds,
            Pageable pageable
    );
}
