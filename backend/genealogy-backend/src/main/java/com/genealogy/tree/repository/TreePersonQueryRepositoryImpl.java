package com.genealogy.tree.repository;

import com.genealogy.tree.query.TreePersonSnapshot;
import com.genealogy.tree.repository.mybatis.TreePersonQueryMapper;
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
public class TreePersonQueryRepositoryImpl implements TreePersonQueryRepository {

    private static final Comparator<TreePersonSnapshot> PERSON_ORDER = Comparator
            .comparing((TreePersonSnapshot person) -> person.generationNo() == null ? Integer.MAX_VALUE : person.generationNo())
            .thenComparing(person -> person.personCode() == null ? "" : person.personCode())
            .thenComparing(person -> person.id() == null ? Long.MAX_VALUE : person.id());

    private final TreePersonQueryMapper queryMapper;

    public TreePersonQueryRepositoryImpl(TreePersonQueryMapper queryMapper) {
        this.queryMapper = queryMapper;
    }

    @Override
    public List<TreePersonSnapshot> findTreePersonSnapshotsByIds(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses
    ) {
        List<Long> ids = normalizedIds(personIds);
        List<String> normalizedStatuses = normalizedStrings(statuses);
        if (clanId == null || ids.isEmpty() || normalizedStatuses.isEmpty()) {
            return List.of();
        }
        Map<Long, TreePersonSnapshot> deduplicated = new LinkedHashMap<>();
        for (List<Long> batch : TreeQueryBatcher.partition(ids, TreeQueryBatcher.DEFAULT_BATCH_SIZE)) {
            for (TreePersonSnapshot person : queryMapper.selectByIds(clanId, batch, normalizedStatuses)) {
                deduplicated.putIfAbsent(person.id(), person);
            }
        }
        List<TreePersonSnapshot> result = new ArrayList<>(deduplicated.values());
        result.sort(Comparator.comparing(TreePersonSnapshot::id, Comparator.nullsLast(Long::compareTo)));
        return List.copyOf(result);
    }

    @Override
    public List<TreePersonSnapshot> findTreePersonSnapshotsByBranches(
            Long clanId,
            Collection<Long> branchIds,
            Collection<String> statuses,
            Pageable pageable
    ) {
        List<Long> ids = normalizedIds(branchIds);
        List<String> normalizedStatuses = normalizedStrings(statuses);
        if (clanId == null || ids.isEmpty() || normalizedStatuses.isEmpty()) {
            return List.of();
        }

        Integer fetchLimit = requiredLimit(pageable);
        Map<Long, TreePersonSnapshot> deduplicated = new LinkedHashMap<>();
        for (List<Long> batch : TreeQueryBatcher.partition(ids, TreeQueryBatcher.DEFAULT_BATCH_SIZE)) {
            for (TreePersonSnapshot person : queryMapper.selectByBranches(clanId, batch, normalizedStatuses, fetchLimit)) {
                deduplicated.putIfAbsent(person.id(), person);
            }
        }
        List<TreePersonSnapshot> result = new ArrayList<>(deduplicated.values());
        result.sort(PERSON_ORDER);
        return slice(result, pageable);
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
