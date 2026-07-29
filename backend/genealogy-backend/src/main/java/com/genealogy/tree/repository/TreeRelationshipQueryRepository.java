package com.genealogy.tree.repository;

import com.genealogy.tree.query.TreeRelationshipSnapshot;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
import java.util.List;

/** Dedicated Tree relationship read-model fragment. */
public interface TreeRelationshipQueryRepository {

    List<TreeRelationshipSnapshot> findTreeOutgoingSnapshots(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            boolean lineageOnly
    );

    List<TreeRelationshipSnapshot> findTreeIncomingSnapshots(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            boolean lineageOnly
    );

    List<TreeRelationshipSnapshot> findTreeWithinPeopleSnapshots(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            Pageable pageable
    );
}