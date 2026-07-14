package com.genealogy.source.repository;

import com.genealogy.common.persistence.TargetCountProjection;
import com.genealogy.source.entity.SourceAttachmentEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SourceAttachmentRepository extends JpaRepository<SourceAttachmentEntity, Long> {

    List<SourceAttachmentEntity> findTop5BySourceIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long sourceId);

    List<SourceAttachmentEntity> findTop10BySourceIdInAndDeletedAtIsNullOrderByCreatedAtDesc(Collection<Long> sourceIds);

    Page<SourceAttachmentEntity> findBySourceIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long sourceId, Pageable pageable);

    Optional<SourceAttachmentEntity> findByIdAndDeletedAtIsNull(Long id);

    int countBySourceIdAndDeletedAtIsNull(Long sourceId);

    @Query(value = """
            select binding.target_id as "targetId", count(attachment.id) as "count"
            from source_binding binding
            join source_attachment attachment on attachment.source_id = binding.source_id
            where binding.clan_id = :clanId
              and binding.target_type = :targetType
              and binding.target_id in (:targetIds)
              and binding.binding_status <> :excludedStatus
              and attachment.deleted_at is null
            group by binding.target_id
            """, nativeQuery = true)
    List<TargetCountProjection> countActiveByTargets(
            @Param("clanId") Long clanId,
            @Param("targetType") String targetType,
            @Param("targetIds") Collection<Long> targetIds,
            @Param("excludedStatus") String excludedStatus);
}
