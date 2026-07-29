package com.genealogy.relationship.repository;

import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.tree.repository.TreeRelationshipQueryRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RelationshipRepository extends
        JpaRepository<RelationshipEntity, Long>,
        TreeRelationshipQueryRepository {

    /** Compatibility adapter for the existing graph traversal chain. */
    default List<RelationshipEntity> findTreeOutgoing(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            boolean lineageOnly
    ) {
        return findTreeOutgoingSnapshots(clanId, personIds, statuses, categories, lineageOnly).stream()
                .map(snapshot -> snapshot.toDetachedEntity())
                .toList();
    }

    /** Compatibility adapter for the existing graph traversal chain. */
    default List<RelationshipEntity> findTreeIncoming(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            boolean lineageOnly
    ) {
        return findTreeIncomingSnapshots(clanId, personIds, statuses, categories, lineageOnly).stream()
                .map(snapshot -> snapshot.toDetachedEntity())
                .toList();
    }

    /** Compatibility adapter for the existing bounded branch graph flow. */
    default List<RelationshipEntity> findTreeWithinPeople(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            Pageable pageable
    ) {
        return findTreeWithinPeopleSnapshots(clanId, personIds, statuses, categories, pageable).stream()
                .map(snapshot -> snapshot.toDetachedEntity())
                .toList();
    }

    List<RelationshipEntity> findByFromPersonIdAndDeletedAtIsNull(Long fromPersonId);

    List<RelationshipEntity> findByToPersonIdAndDeletedAtIsNull(Long toPersonId);

    List<RelationshipEntity> findByClanIdAndDeletedAtIsNull(Long clanId);

    Optional<RelationshipEntity> findByIdAndClanIdAndDeletedAtIsNull(Long id, Long clanId);

    @Query("select r from RelationshipEntity r where r.clanId = :clanId and r.fromPersonId = :fromId and r.toPersonId = :toId and r.relationType = :type and r.deletedAt is null")
    List<RelationshipEntity> findActiveSameRelation(
            @Param("clanId") Long clanId,
            @Param("fromId") Long fromId,
            @Param("toId") Long toId,
            @Param("type") String type
    );

    @Query("select r from RelationshipEntity r where r.clanId = :clanId and r.toPersonId = :toId and r.relationType = :type and r.deletedAt is null")
    List<RelationshipEntity> findActiveToRelations(
            @Param("clanId") Long clanId,
            @Param("toId") Long toId,
            @Param("type") String type
    );
}
