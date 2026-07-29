package com.genealogy.tree.repository;

import com.genealogy.relationship.entity.RelationshipEntity;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
import java.util.List;

/**
 * Dedicated read model for graph traversal. Relationship CRUD repositories
 * inherit this fragment without owning the complex graph JPQL.
 */
public interface TreeRelationshipQueryRepository {

    List<RelationshipEntity> findTreeOutgoing(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            boolean lineageOnly
    );

    List<RelationshipEntity> findTreeIncoming(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            boolean lineageOnly
    );

    List<RelationshipEntity> findTreeWithinPeople(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            Pageable pageable
    );
}
