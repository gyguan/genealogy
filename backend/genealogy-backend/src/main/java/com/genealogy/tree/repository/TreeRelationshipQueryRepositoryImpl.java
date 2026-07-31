package com.genealogy.tree.repository;

import com.genealogy.tree.query.TreeRelationshipSnapshot;
import com.genealogy.tree.repository.mybatis.TreeRelationshipQueryMapper;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

@Repository
public class TreeRelationshipQueryRepositoryImpl implements TreeRelationshipQueryRepository {

    private static final Comparator<TreeRelationshipSnapshot> OUTGOING_ORDER = Comparator
            .comparing(TreeRelationshipSnapshot::fromPersonId, Comparator.nullsLast(Long::compareTo))
            .thenComparing(TreeRelationshipSnapshot::toPersonId, Comparator.nullsLast(Long::compareTo))
            .thenComparing(TreeRelationshipSnapshot::id, Comparator.nullsLast(Long::compareTo));

    private static final Comparator<TreeRelationshipSnapshot> INCOMING_ORDER = Comparator
            .comparing(TreeRelationshipSnapshot::toPersonId, Comparator.nullsLast(Long::compareTo))
            .thenComparing(TreeRelationshipSnapshot::fromPersonId, Comparator.nullsLast(Long::compareTo))
            .thenComparing(TreeRelationshipSnapshot::id, Comparator.nullsLast(Long::compareTo));

    private final TreeRelationshipQueryMapper queryMapper;

    public TreeRelationshipQueryRepositoryImpl(TreeRelationshipQueryMapper queryMapper) {
        this.queryMapper = queryMapper;
    }

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
        List<Long> ids = normalizedIds(personIds);
        List<String> normalizedStatuses = normalizedStrings(statuses);
        List<String> normalizedCategories = normalizedStrings(categories);
        if (clanId == null || ids.isEmpty() || normalizedStatuses.isEmpty() || normalizedCategories.isEmpty()) {
            return List.of();
        }

        Integer fetchLimit = requiredLimit(pageable);
        Map<Long, TreeRelationshipSnapshot> deduplicated = new LinkedHashMap<>();
        List<List<Long>> batches = TreeQueryBatcher.partition(ids, TreeQueryBatcher.DEFAULT_BATCH_SIZE);
        for (List<Long> fromBatch : batches) {
            for (List<Long> toBatch : batches) {
                for (TreeRelationshipSnapshot relationship : queryMapper.selectWithinPeople(
                        clanId, fromBatch, toBatch, normalizedStatuses, normalizedCategories, fetchLimit
                )) {
                    deduplicated.putIfAbsent(key(relationship), relationship);
                }
            }
        }

        List<TreeRelationshipSnapshot> result = new ArrayList<>(deduplicated.values());
        result.sort(OUTGOING_ORDER);
        return slice(result, pageable);
    }

    private List<TreeRelationshipSnapshot> findDirectional(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            boolean lineageOnly,
            boolean outgoing
    ) {
        List<Long> ids = normalizedIds(personIds);
        List<String> normalizedStatuses = normalizedStrings(statuses);
        List<String> normalizedCategories = normalizedStrings(categories);
        if (clanId == null || ids.isEmpty() || normalizedStatuses.isEmpty() || normalizedCategories.isEmpty()) {
            return List.of();
        }

        Map<Long, TreeRelationshipSnapshot> deduplicated = new LinkedHashMap<>();
        for (List<Long> batch : TreeQueryBatcher.partition(ids, TreeQueryBatcher.DEFAULT_BATCH_SIZE)) {
            List<TreeRelationshipSnapshot> rows = outgoing
                    ? queryMapper.selectOutgoing(clanId, batch, normalizedStatuses, normalizedCategories, lineageOnly)
                    : queryMapper.selectIncoming(clanId, batch, normalizedStatuses, normalizedCategories, lineageOnly);
            for (TreeRelationshipSnapshot relationship : rows) {
                deduplicated.putIfAbsent(key(relationship), relationship);
            }
        }
        List<TreeRelationshipSnapshot> result = new ArrayList<>(deduplicated.values());
        result.sort(outgoing ? OUTGOING_ORDER : INCOMING_ORDER);
        return List.copyOf(result);
    }

    private static Long key(TreeRelationshipSnapshot relationship) {
        if (relationship.id() != null) {
            return relationship.id();
        }
        long from = relationship.fromPersonId() == null ? 0 : relationship.fromPersonId();
        long to = relationship.toPersonId() == null ? 0 : relationship.toPersonId();
        long type = relationship.relationType() == null ? 0 : relationship.relationType().hashCode();
        return Long.MIN_VALUE ^ (from * 31L) ^ (to * 17L) ^ type;
    }

    private static Integer requiredLimit(Pageable pageable) {
        if (pageable == null || pageable.isUnpaged()) {
            return null;
        }
        long required = pageable.getOffset() + pageable.getPageSize();
        return Math.toIntExact(Math.min(Integer.MAX_VALUE, required));
    }

    private static <T> List<T> slice(List<T> values, Pageable pageable) {
        if (pageable == null || pageable.isUnpaged()) {
            return List.copyOf(values);
        }
        int from = Math.toIntExact(Math.min(values.size(), pageable.getOffset()));
        int to = Math.min(values.size(), from + pageable.getPageSize());
        return List.copyOf(values.subList(from, to));
    }

    private static List<Long> normalizedIds(Collection<Long> values) {
        LinkedHashSet<Long> normalized = new LinkedHashSet<>();
        if (values != null) {
            values.stream().filter(java.util.Objects::nonNull).sorted().forEach(normalized::add);
        }
        return List.copyOf(normalized);
    }

    private static List<String> normalizedStrings(Collection<String> values) {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        if (values != null) {
            values.stream().filter(value -> value != null && !value.isBlank()).forEach(normalized::add);
        }
        return List.copyOf(normalized);
    }
}
