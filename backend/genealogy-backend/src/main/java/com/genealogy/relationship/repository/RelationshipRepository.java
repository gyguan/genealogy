package com.genealogy.relationship.repository;

import com.genealogy.relationship.entity.RelationshipEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RelationshipRepository extends JpaRepository<RelationshipEntity, Long> {

    List<RelationshipEntity> findByFromPersonIdAndDeletedAtIsNull(Long fromPersonId);

    List<RelationshipEntity> findByToPersonIdAndDeletedAtIsNull(Long toPersonId);

    List<RelationshipEntity> findByClanIdAndDeletedAtIsNull(Long clanId);

    Optional<RelationshipEntity> findByIdAndClanIdAndDeletedAtIsNull(Long id, Long clanId);

    @Query("select r from RelationshipEntity r where r.clanId = :clanId and r.fromPersonId = :fromId and r.toPersonId = :toId and r.relationType = :type and r.deletedAt is null")
    List<RelationshipEntity> findActiveSameRelation(@Param("clanId") Long clanId, @Param("fromId") Long fromId, @Param("toId") Long toId, @Param("type") String type);

    @Query("select r from RelationshipEntity r where r.clanId = :clanId and r.toPersonId = :toId and r.relationType = :type and r.deletedAt is null")
    List<RelationshipEntity> findActiveToRelations(@Param("clanId") Long clanId, @Param("toId") Long toId, @Param("type") String type);

    @Query("""
            select r
            from RelationshipEntity r
            where r.clanId = :clanId
              and r.fromPersonId in :personIds
              and r.dataStatus in :statuses
              and r.deletedAt is null
              and (:lineageOnly = false or r.relationType = 'parent_child' or r.isLineageRelation = true)
              and (case
                    when r.relationCategory is null or trim(r.relationCategory) = '' then
                      case
                        when lower(r.relationType) = 'spouse' then 'marriage'
                        when lower(r.relationType) in ('adoptive','successor','out_adoption','in_adoption','dual_successor','heir_son') then 'ritual'
                        when lower(r.relationType) = 'no_descendant' then 'status'
                        else 'blood'
                      end
                    else lower(trim(r.relationCategory))
                   end) in :categories
            order by r.fromPersonId, r.toPersonId, r.id
            """)
    List<RelationshipEntity> findTreeOutgoing(
            @Param("clanId") Long clanId,
            @Param("personIds") Collection<Long> personIds,
            @Param("statuses") Collection<String> statuses,
            @Param("categories") Collection<String> categories,
            @Param("lineageOnly") boolean lineageOnly
    );

    @Query("""
            select r
            from RelationshipEntity r
            where r.clanId = :clanId
              and r.toPersonId in :personIds
              and r.dataStatus in :statuses
              and r.deletedAt is null
              and (:lineageOnly = false or r.relationType = 'parent_child' or r.isLineageRelation = true)
              and (case
                    when r.relationCategory is null or trim(r.relationCategory) = '' then
                      case
                        when lower(r.relationType) = 'spouse' then 'marriage'
                        when lower(r.relationType) in ('adoptive','successor','out_adoption','in_adoption','dual_successor','heir_son') then 'ritual'
                        when lower(r.relationType) = 'no_descendant' then 'status'
                        else 'blood'
                      end
                    else lower(trim(r.relationCategory))
                   end) in :categories
            order by r.toPersonId, r.fromPersonId, r.id
            """)
    List<RelationshipEntity> findTreeIncoming(
            @Param("clanId") Long clanId,
            @Param("personIds") Collection<Long> personIds,
            @Param("statuses") Collection<String> statuses,
            @Param("categories") Collection<String> categories,
            @Param("lineageOnly") boolean lineageOnly
    );

    @Query("""
            select r
            from RelationshipEntity r
            where r.clanId = :clanId
              and r.fromPersonId in :personIds
              and r.toPersonId in :personIds
              and r.dataStatus in :statuses
              and r.deletedAt is null
              and (case
                    when r.relationCategory is null or trim(r.relationCategory) = '' then
                      case
                        when lower(r.relationType) = 'spouse' then 'marriage'
                        when lower(r.relationType) in ('adoptive','successor','out_adoption','in_adoption','dual_successor','heir_son') then 'ritual'
                        when lower(r.relationType) = 'no_descendant' then 'status'
                        else 'blood'
                      end
                    else lower(trim(r.relationCategory))
                   end) in :categories
            order by r.fromPersonId, r.toPersonId, r.id
            """)
    List<RelationshipEntity> findTreeWithinPeople(
            @Param("clanId") Long clanId,
            @Param("personIds") Collection<Long> personIds,
            @Param("statuses") Collection<String> statuses,
            @Param("categories") Collection<String> categories,
            Pageable pageable
    );
}
