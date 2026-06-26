package com.genealogy.review.repository;

import com.genealogy.review.entity.CheckTaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CheckTaskRepository extends JpaRepository<CheckTaskEntity, Long> {

    List<CheckTaskEntity> findByClanIdAndStatus(Long clanId, String status);

    Optional<CheckTaskEntity> findByRevisionId(Long revisionId);
}
