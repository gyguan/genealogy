package com.genealogy.source.repository;

import com.genealogy.source.entity.SourceEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface SourceRepository extends JpaRepository<SourceEntity, Long>, JpaSpecificationExecutor<SourceEntity> {

    Page<SourceEntity> findByClanId(Long clanId, Pageable pageable);

    @Query("""
            select source
            from SourceEntity source
            where source.clanId = :clanId
              and source.id in :sourceIds
              and source.deletedAt is null
            """)
    List<SourceEntity> findTreeSourcesByIds(
            @Param("clanId") Long clanId,
            @Param("sourceIds") Collection<Long> sourceIds);

    @Query(value = "select count(*) from source_attachment where source_id = :sourceId and deleted_at is null", nativeQuery = true)
    int countAttachmentsBySourceId(@Param("sourceId") Long sourceId);
}
