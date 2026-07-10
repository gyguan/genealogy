package com.genealogy.review.repository;

import com.genealogy.review.entity.ReviewTaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReviewTaskRepository extends JpaRepository<ReviewTaskEntity, Long> {

    Optional<ReviewTaskEntity> findFirstByRevisionIdOrderByReviewLevelAsc(Long revisionId);
}
