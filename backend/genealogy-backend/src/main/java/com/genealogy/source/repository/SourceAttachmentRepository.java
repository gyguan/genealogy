package com.genealogy.source.repository;

import com.genealogy.source.entity.SourceAttachmentEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SourceAttachmentRepository extends JpaRepository<SourceAttachmentEntity, Long> {

    List<SourceAttachmentEntity> findTop5BySourceIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long sourceId);

    Page<SourceAttachmentEntity> findBySourceIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long sourceId, Pageable pageable);

    Optional<SourceAttachmentEntity> findByIdAndDeletedAtIsNull(Long id);

    int countBySourceIdAndDeletedAtIsNull(Long sourceId);
}
