package com.genealogy.source.repository;

import com.genealogy.source.entity.SourceBindingEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

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

    List<SourceBindingEntity> findTop5BySourceIdOrderByCreatedAtDesc(Long sourceId);

    List<SourceBindingEntity> findTop5BySourceIdAndBindingStatusNotOrderByCreatedAtDesc(Long sourceId, String bindingStatus);

    boolean existsBySourceIdAndTargetTypeAndTargetId(Long sourceId, String targetType, Long targetId);

    boolean existsBySourceIdAndTargetTypeAndTargetIdAndBindingStatusNot(Long sourceId, String targetType, Long targetId, String bindingStatus);

    int countBySourceId(Long sourceId);

    int countBySourceIdAndBindingStatusNot(Long sourceId, String bindingStatus);
}
