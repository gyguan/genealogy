package com.genealogy.review.repository;

import com.genealogy.review.entity.ReviewTaskEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.Optional;

public interface ReviewTaskRepository extends JpaRepository<ReviewTaskEntity, Long> {

    Optional<ReviewTaskEntity> findFirstByRevisionIdOrderByReviewLevelAsc(Long revisionId);

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
