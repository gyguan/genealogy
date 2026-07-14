package com.genealogy.review.repository;

import com.genealogy.common.persistence.TargetCountProjection;
import com.genealogy.review.entity.RevisionEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RevisionRepository extends JpaRepository<RevisionEntity, Long> {

    Optional<RevisionEntity> findByIdAndTargetType(Long id, String targetType);

    Optional<RevisionEntity> findByTraceId(UUID traceId);

    Optional<RevisionEntity> findFirstByClanIdAndTargetTypeAndTargetIdOrderBySubmitTimeDesc(
            Long clanId,
            String targetType,
            Long targetId);

    boolean existsByTargetTypeAndTargetIdAndStatus(String targetType, Long targetId, String status);

    List<RevisionEntity> findByTargetTypeAndTargetIdInAndStatusAndChangeTypeIn(
            String targetType, Collection<Long> targetIds, String status, Collection<String> changeTypes
    );

    @Query("""
            select revision.targetId as targetId, count(revision.id) as count
            from RevisionEntity revision
            where revision.clanId = :clanId
              and revision.targetType = :targetType
              and revision.targetId in :targetIds
            group by revision.targetId
            """)
    List<TargetCountProjection> countByTargets(
            @Param("clanId") Long clanId,
            @Param("targetType") String targetType,
            @Param("targetIds") Collection<Long> targetIds);

    Page<RevisionEntity> findByClanIdAndTargetTypeAndTargetIdOrderBySubmitTimeDesc(
            Long clanId,
            String targetType,
            Long targetId,
            Pageable pageable
    );
}
