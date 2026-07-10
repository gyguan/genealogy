package com.genealogy.relationship.repository;

import com.genealogy.relationship.entity.RelationshipEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
}
