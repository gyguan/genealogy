package com.genealogy.tree.repository;

import com.genealogy.relationship.entity.RelationshipEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.data.domain.Pageable;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Tree relationship read repository backed by minimal detached snapshots. */
public class TreeRelationshipQueryRepositoryImpl implements TreeRelationshipQueryRepository {

    private static final Comparator<RelationshipEntity> OUTGOING_ORDER = Comparator
            .comparing(RelationshipEntity::getFromPersonId)
            .thenComparing(RelationshipEntity::getToPersonId)
            .thenComparing(entity -> entity.getId() == null ? Long.MAX_VALUE : entity.getId());

    private static final Comparator<RelationshipEntity> INCOMING_ORDER = Comparator
            .comparing(RelationshipEntity::getToPersonId)
            .thenComparing(RelationshipEntity::getFromPersonId)
            .thenComparing(entity -> entity.getId() == null ? Long.MAX_VALUE : entity.getId());

    private static final String RELATIONSHIP_READ_SELECT = """
            select r.id, r.clanId, r.fromPersonId, r.toPersonId,
                   r.relationType, r.relationLabel, r.relationCategory,
                   r.ritualRelationType, r.successionReason, r.successorBranchId,
                   r.isLineageRelation, r.isBiological, r.isPrimary,
                   r.description, r.confidenceLevel, r.dataStatus, r.createdBy
            from RelationshipEntity r
            """;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public List<RelationshipEntity> findTreeOutgoing(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            boolean lineageOnly
    ) {
        return findDirectional(clanId, personIds, statuses, categories, lineageOnly, true);
    }

    @Override
    public List<RelationshipEntity> findTreeIncoming(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            boolean lineageOnly
    ) {
        return findDirectional(clanId, personIds, statuses, categories, lineageOnly, false);
    }

    @Override
    public List<RelationshipEntity> findTreeWithinPeople(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            Pageable pageable
    ) {
        if (personIds == null || personIds.isEmpty()) {
            return List.of();
        }
        Query query = entityManager.createQuery(RELATIONSHIP_READ_SELECT + """
                where r.clanId = :clanId
                  and r.fromPersonId in :personIds
                  and r.toPersonId in :personIds
                  and r.dataStatus in :statuses
                  and r.deletedAt is null
                  and r.relationCategory in :categories
                order by r.fromPersonId, r.toPersonId, r.id
                """);
        bindCommon(query, clanId, personIds, statuses, categories);
        if (pageable != null) {
            query.setFirstResult(Math.toIntExact(pageable.getOffset()));
            query.setMaxResults(pageable.getPageSize());
        }
        return rows(query).stream().map(this::snapshot).toList();
    }

    private List<RelationshipEntity> findDirectional(
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
        Map<Long, RelationshipEntity> deduplicated = new LinkedHashMap<>();
        for (List<Long> batch : TreeQueryBatcher.partition(personIds, TreeQueryBatcher.DEFAULT_BATCH_SIZE)) {
            Query query = entityManager.createQuery(directionalJpql(outgoing));
            bindCommon(query, clanId, batch, statuses, categories);
            query.setParameter("lineageOnly", lineageOnly);
            for (Object[] row : rows(query)) {
                RelationshipEntity relationship = snapshot(row);
                Long key = relationship.getId();
                if (key == null) {
                    key = syntheticKey(relationship);
                }
                deduplicated.putIfAbsent(key, relationship);
            }
        }
        List<RelationshipEntity> result = new ArrayList<>(deduplicated.values());
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
            Query query,
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

    @SuppressWarnings("unchecked")
    private List<Object[]> rows(Query query) {
        return (List<Object[]>) query.getResultList();
    }

    private RelationshipEntity snapshot(Object[] row) {
        RelationshipEntity relationship = new RelationshipEntity();
        int i = 0;
        relationship.setId((Long) row[i++]);
        relationship.setClanId((Long) row[i++]);
        relationship.setFromPersonId((Long) row[i++]);
        relationship.setToPersonId((Long) row[i++]);
        relationship.setRelationType((String) row[i++]);
        relationship.setRelationLabel((String) row[i++]);
        relationship.setRelationCategory((String) row[i++]);
        relationship.setRitualRelationType((String) row[i++]);
        relationship.setSuccessionReason((String) row[i++]);
        relationship.setSuccessorBranchId((Long) row[i++]);
        relationship.setIsLineageRelation((Boolean) row[i++]);
        relationship.setIsBiological((Boolean) row[i++]);
        relationship.setIsPrimary((Boolean) row[i++]);
        relationship.setDescription((String) row[i++]);
        relationship.setConfidenceLevel((String) row[i++]);
        relationship.setDataStatus((String) row[i++]);
        relationship.setCreatedBy((Long) row[i]);
        return relationship;
    }

    private long syntheticKey(RelationshipEntity relationship) {
        long from = relationship.getFromPersonId() == null ? 0 : relationship.getFromPersonId();
        long to = relationship.getToPersonId() == null ? 0 : relationship.getToPersonId();
        long type = relationship.getRelationType() == null ? 0 : relationship.getRelationType().hashCode();
        return Long.MIN_VALUE ^ (from * 31L) ^ (to * 17L) ^ type;
    }
}
