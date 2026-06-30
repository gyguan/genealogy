package com.genealogy.source.attachment.repository;

import com.genealogy.source.attachment.entity.SourceAttachmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SourceAttachmentRepository extends JpaRepository<SourceAttachmentEntity, Long> {

    List<SourceAttachmentEntity> findBySourceIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long sourceId);

    Optional<SourceAttachmentEntity> findByIdAndDeletedAtIsNull(Long id);
}
