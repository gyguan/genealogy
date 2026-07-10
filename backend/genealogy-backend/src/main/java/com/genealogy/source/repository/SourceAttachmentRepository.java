package com.genealogy.source.repository;

import com.genealogy.source.entity.SourceAttachmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SourceAttachmentRepository extends JpaRepository<SourceAttachmentEntity, Long> {

    List<SourceAttachmentEntity> findTop5BySourceIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long sourceId);

    int countBySourceIdAndDeletedAtIsNull(Long sourceId);
}
