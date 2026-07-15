package com.genealogy.review.repository;

import com.genealogy.review.entity.ReviewTaskEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReviewTaskRepository extends JpaRepository<ReviewTaskEntity, Long> {

    Optional<ReviewTaskEntity> findFirstByRevisionIdOrderByReviewLevelAsc(Long revisionId);

    @Query("""
            select task
            from ReviewTaskEntity task
            where task.clanId = :clanId
              and task.revisionId in :revisionIds
            order by task.revisionId, task.reviewLevel, task.id
            """)
    List<ReviewTaskEntity> findTreeReviewTasksByRevisionIds(
            @Param("clanId") Long clanId,
            @Param("revisionIds") Collection<Long> revisionIds);

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
