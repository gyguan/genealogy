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

    long countByClanId(Long clanId);

    @Query("""
            select source.sourceType, count(source)
            from SourceEntity source
            where source.clanId = :clanId
            group by source.sourceType
            """)
    List<Object[]> countDashboardBySourceType(@Param("clanId") Long clanId);

    @Query("""
            select source
            from SourceEntity source
            where source.clanId = :clanId
            order by source.updatedAt desc nulls last, source.createdAt desc nulls last, source.id desc
            """)
    List<SourceEntity> findRecentDashboardSources(@Param("clanId") Long clanId, Pageable pageable);

    @Query("""
            select source
            from SourceEntity source
            where source.clanId = :clanId
              and source.id in :sourceIds
            """)
    List<SourceEntity> findTreeSourcesByIds(
            @Param("clanId") Long clanId,
            @Param("sourceIds") Collection<Long> sourceIds);

    @Query(value = "select count(*) from source_attachment where source_id = :sourceId and deleted_at is null", nativeQuery = true)
    int countAttachmentsBySourceId(@Param("sourceId") Long sourceId);
}
