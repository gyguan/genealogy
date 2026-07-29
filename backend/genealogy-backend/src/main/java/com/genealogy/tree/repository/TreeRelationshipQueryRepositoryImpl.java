package com.genealogy.tree.repository;

import com.genealogy.tree.query.TreeRelationshipSnapshot;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.data.domain.Pageable;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Tree relationship read repository backed by immutable constructor projections. */
public class TreeRelationshipQueryRepositoryImpl implements TreeRelationshipQueryRepository {

    private static final Comparator<TreeRelationshipSnapshot> OUTGOING_ORDER = Comparator
            .comparing(TreeRelationshipSnapshot::fromPersonId)
            .thenComparing(TreeRelationshipSnapshot::toPersonId)
            .thenComparing(entity -> entity.id() == null ? Long.MAX_VALUE : entity.id());

    private static final Comparator<TreeRelationshipSnapshot> INCOMING_ORDER = Comparator
            .comparing(TreeRelationshipSnapshot::toPersonId)
            .thenComparing(TreeRelationshipSnapshot::fromPersonId)
            .thenComparing(entity -> entity.id() == null ? Long.MAX_VALUE : entity.id());

    private static final String RELATIONSHIP_READ_SELECT = """
            select new com.genealogy.tree.query.TreeRelationshipSnapshot(
                   r.id, r.clanId, r.fromPersonId, r.toPersonId,
                   r.relationType, r.relationLabel, r.relationCategory,
                   r.ritualRelationType, r.successionReason, r.successorBranchId,
                   r.isLineageRelation, r.isBiological, r.isPrimary,
                   r.description, r.confidenceLevel, r.dataStatus, r.createdBy)
            from RelationshipEntity r
            """;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public List<TreeRelationshipSnapshot> findTreeOutgoingSnapshots(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            boolean lineageOnly
    ) {
        return findDirectional(clanId, personIds, statuses, categories, lineageOnly, true);
    }

    @Override
    public List<TreeRelationshipSnapshot> findTreeIncomingSnapshots(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            boolean lineageOnly
    ) {
        return findDirectional(clanId, personIds, statuses, categories, lineageOnly, false);
    }

    @Override
    public List<TreeRelationshipSnapshot> findTreeWithinPeopleSnapshots(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            Pageable pageable
    ) {
        if (personIds == null || personIds.isEmpty()) {
            return List.of();
        }
        TypedQuery<TreeRelationshipSnapshot> query = entityManager.createQuery(RELATIONSHIP_READ_SELECT + """
                where r.clanId = :clanId
                  and r.fromPersonId in :personIds
                  and r.toPersonId in :personIds
                  and r.dataStatus in :statuses
                  and r.deletedAt is null
                  and r.relationCategory in :categories
                order by r.fromPersonId, r.toPersonId, r.id
                """, TreeRelationshipSnapshot.class);
        bindCommon(query, clanId, personIds, statuses, categories);
        if (pageable != null) {
            query.setFirstResult(Math.toIntExact(pageable.getOffset()));
            query.setMaxResults(pageable.getPageSize());
        }
        return List.copyOf(query.getResultList());
    }

    private List<TreeRelationshipSnapshot> findDirectional(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            boolean lineageOnly,
            boolean outgoing
    ) {
        if (personIds == null || personIds.isEmpty()) {
            return List.of();
        }
        Map<Long, TreeRelationshipSnapshot> deduplicated = new LinkedHashMap<>();
        for (List<Long> batch : TreeQueryBatcher.partition(personIds, TreeQueryBatcher.DEFAULT_BATCH_SIZE)) {
            TypedQuery<TreeRelationshipSnapshot> query = entityManager.createQuery(
                    directionalJpql(outgoing), TreeRelationshipSnapshot.class
            );
            bindCommon(query, clanId, batch, statuses, categories);
            query.setParameter("lineageOnly", lineageOnly);
            for (TreeRelationshipSnapshot relationship : query.getResultList()) {
                Long key = relationship.id();
                if (key == null) {
                    key = syntheticKey(relationship);
                }
                deduplicated.putIfAbsent(key, relationship);
            }
        }
        List<TreeRelationshipSnapshot> result = new ArrayList<>(deduplicated.values());
        result.sort(outgoing ? OUTGOING_ORDER : INCOMING_ORDER);
        return List.copyOf(result);
    }

    private String directionalJpql(boolean outgoing) {
        String endpoint = outgoing ? "r.fromPersonId" : "r.toPersonId";
        String order = outgoing
                ? "r.fromPersonId, r.toPersonId, r.id"
                : "r.toPersonId, r.fromPersonId, r.id";
        return RELATIONSHIP_READ_SELECT
                + "where r.clanId = :clanId "
                + "and " + endpoint + " in :personIds "
                + "and r.dataStatus in :statuses "
                + "and r.deletedAt is null "
                + "and (:lineageOnly = false or r.relationType = 'parent_child' or r.isLineageRelation = true) "
                + "and r.relationCategory in :categories "
                + "order by " + order;
    }

    private void bindCommon(
            TypedQuery<TreeRelationshipSnapshot> query,
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories
    ) {
        query.setParameter("clanId", clanId);
        query.setParameter("personIds", personIds);
        query.setParameter("statuses", statuses);
        query.setParameter("categories", categories);
    }

    private long syntheticKey(TreeRelationshipSnapshot relationship) {
        long from = relationship.fromPersonId() == null ? 0 : relationship.fromPersonId();
        long to = relationship.toPersonId() == null ? 0 : relationship.toPersonId();
        long type = relationship.relationType() == null ? 0 : relationship.relationType().hashCode();
        return Long.MIN_VALUE ^ (from * 31L) ^ (to * 17L) ^ type;
    }
}