package com.genealogy.review.repository;

import com.genealogy.review.entity.RevisionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RevisionRepository extends JpaRepository<RevisionEntity, Long> {

    Optional<RevisionEntity> findByIdAndTargetType(Long id, String targetType);

    boolean existsByTargetTypeAndTargetIdAndStatus(String targetType, Long targetId, String status);

    List<RevisionEntity> findByTargetTypeAndTargetIdInAndStatusAndChangeTypeIn(
            String targetType, Collection<Long> targetIds, String status, Collection<String> changeTypes
    );
}
