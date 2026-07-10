package com.genealogy.source.repository;

import com.genealogy.source.entity.SourceBindingEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SourceBindingRepository extends JpaRepository<SourceBindingEntity, Long> {

    List<SourceBindingEntity> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(String targetType, Long targetId);

    List<SourceBindingEntity> findBySourceIdOrderByCreatedAtDesc(Long sourceId);

    Page<SourceBindingEntity> findBySourceIdOrderByCreatedAtDesc(Long sourceId, Pageable pageable);

    Page<SourceBindingEntity> findBySourceIdAndTargetTypeOrderByCreatedAtDesc(Long sourceId, String targetType, Pageable pageable);

    List<SourceBindingEntity> findTop5BySourceIdOrderByCreatedAtDesc(Long sourceId);

    boolean existsBySourceIdAndTargetTypeAndTargetId(Long sourceId, String targetType, Long targetId);

    int countBySourceId(Long sourceId);
}
