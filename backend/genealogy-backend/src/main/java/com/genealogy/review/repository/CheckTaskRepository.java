package com.genealogy.review.repository;

import com.genealogy.review.entity.CheckTaskEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CheckTaskRepository extends JpaRepository<CheckTaskEntity, Long> {

    List<CheckTaskEntity> findByClanIdAndStatus(Long clanId, String status);

    Optional<CheckTaskEntity> findByRevisionId(Long revisionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select task from CheckTaskEntity task where task.id = :taskId")
    Optional<CheckTaskEntity> findByIdForDecision(@Param("taskId") Long taskId);
}
