package com.genealogy.review.repository;

import com.genealogy.review.entity.ReviewTaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewTaskRepository extends JpaRepository<ReviewTaskEntity, Long> {

    List<ReviewTaskEntity> findByClanIdAndStatusOrderByCreatedAtDesc(Long clanId, String status);

    Optional<ReviewTaskEntity> findByRevisionId(Long revisionId);
}
