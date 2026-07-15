package com.genealogy.source.repository;

import com.genealogy.common.persistence.TargetCountProjection;
import com.genealogy.source.entity.SourceBindingEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface SourceBindingRepository extends JpaRepository<SourceBindingEntity, Long> {

    List<SourceBindingEntity> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(String targetType, Long targetId);

    List<SourceBindingEntity> findBySourceIdOrderByCreatedAtDesc(Long sourceId);

    List<SourceBindingEntity> findBySourceIdIn(Collection<Long> sourceIds);

    List<SourceBindingEntity> findBySourceIdAndBindingStatusNotOrderByCreatedAtDesc(Long sourceId, String bindingStatus);

    Page<SourceBindingEntity> findBySourceIdOrderByCreatedAtDesc(Long sourceId, Pageable pageable);

    Page<SourceBindingEntity> findBySourceIdAndBindingStatusNotOrderByCreatedAtDesc(Long sourceId, String bindingStatus, Pageable pageable);

    Page<SourceBindingEntity> findBySourceIdAndTargetTypeOrderByCreatedAtDesc(Long sourceId, String targetType, Pageable pageable);

    Page<SourceBindingEntity> findBySourceIdAndTargetTypeAndBindingStatusNotOrderByCreatedAtDesc(Long sourceId, String targetType, String bindingStatus, Pageable pageable);

    Page<SourceBindingEntity> findByClanIdAndTargetTypeAndTargetIdOrderByCreatedAtDesc(Long clanId, String targetType, Long targetId, Pageable pageable);

    Page<SourceBindingEntity> findByClanIdAndSourceIdOrderByCreatedAtDesc(Long clanId, Long sourceId, Pageable pageable);

    List<SourceBindingEntity> findTop5BySourceIdOrderByCreatedAtDesc(Long sourceId);

    List<SourceBindingEntity> findTop5BySourceIdAndBindingStatusNotOrderByCreatedAtDesc(Long sourceId, String bindingStatus);

    List<SourceBindingEntity> findTop10ByClanIdAndTargetTypeAndTargetIdAndBindingStatusNotOrderByCreatedAtDesc(
            Long clanId,
            String targetType,
            Long targetId,
            String bindingStatus);

    @Query("""
            select binding.targetId as targetId, count(binding.id) as count
            from SourceBindingEntity binding
            where binding.clanId = :clanId
              and binding.targetType = :targetType
              and binding.targetId in :targetIds
              and binding.bindingStatus <> :excludedStatus
            group by binding.targetId
            """)
    List<TargetCountProjection> countActiveByTargets(
            @Param("clanId") Long clanId,
            @Param("targetType") String targetType,
            @Param("targetIds") Collection<Long> targetIds,
            @Param("excludedStatus") String excludedStatus);

    @Query("""
            select binding
            from SourceBindingEntity binding
            where binding.clanId = :clanId
              and lower(binding.targetType) in :targetTypes
              and binding.targetId in :targetIds
              and lower(binding.bindingStatus) = 'official'
            order by binding.targetType, binding.targetId, binding.id
            """)
    List<SourceBindingEntity> findTreeBindingsByTargets(
            @Param("clanId") Long clanId,
            @Param("targetTypes") Collection<String> targetTypes,
            @Param("targetIds") Collection<Long> targetIds);

    boolean existsBySourceIdAndTargetTypeAndTargetId(Long sourceId, String targetType, Long targetId);

    boolean existsBySourceIdAndTargetTypeAndTargetIdAndBindingStatusNot(Long sourceId, String targetType, Long targetId, String bindingStatus);

    int countBySourceId(Long sourceId);

    int countBySourceIdAndBindingStatusNot(Long sourceId, String bindingStatus);
}
