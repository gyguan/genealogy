package com.genealogy.source.attachment.repository;

import com.genealogy.source.attachment.entity.LegacySourceAttachmentEntity;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Profile("legacy-source-attachment")
@Repository("legacySourceAttachmentRepository")
public interface LegacySourceAttachmentRepository extends JpaRepository<LegacySourceAttachmentEntity, Long> {

    List<LegacySourceAttachmentEntity> findBySourceIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long sourceId);

    Optional<LegacySourceAttachmentEntity> findByIdAndDeletedAtIsNull(Long id);
}
