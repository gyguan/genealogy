package com.genealogy.tree.repository;

import com.genealogy.tree.query.TreePersonSnapshot;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Tree-specific person read repository backed by immutable constructor projections. */
@Repository
public class TreePersonQueryRepositoryImpl implements TreePersonQueryRepository {

    private static final Comparator<TreePersonSnapshot> PERSON_ORDER = Comparator
            .comparing((TreePersonSnapshot person) -> person.generationNo() == null ? Integer.MAX_VALUE : person.generationNo())
            .thenComparing(person -> person.personCode() == null ? "" : person.personCode())
            .thenComparing(person -> person.id() == null ? Long.MAX_VALUE : person.id());

    private static final String PERSON_READ_SELECT = """
            select new com.genealogy.tree.query.TreePersonSnapshot(
                   p.id, p.clanId, p.branchId, p.personCode, p.name,
                   p.genealogyName, p.courtesyName, p.aliasName, p.gender,
                   p.generationNo, p.generationWord, p.rankInFamily,
                   p.birthDate, p.birthDatePrecision, p.deathDate, p.deathDatePrecision,
                   p.isLiving, p.birthPlace, p.residencePlace,
                   p.hasDescendant, p.lineageStatus, p.privacyLevel, p.dataStatus,
                   p.createdBy, p.updatedBy)
            from TreePersonJpaEntity p
            """;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public List<TreePersonSnapshot> findTreePersonSnapshotsByIds(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses
    ) {
        if (personIds == null || personIds.isEmpty()) {
            return List.of();
        }
        Map<Long, TreePersonSnapshot> deduplicated = new LinkedHashMap<>();
        for (List<Long> batch : TreeQueryBatcher.partition(personIds, TreeQueryBatcher.DEFAULT_BATCH_SIZE)) {
            TypedQuery<TreePersonSnapshot> query = entityManager.createQuery(PERSON_READ_SELECT + """
                    where p.clanId = :clanId
                      and p.id in :personIds
                      and p.dataStatus in :statuses
                      and p.deletedAt is null
                    order by p.id
                    """, TreePersonSnapshot.class);
            bind(query, clanId, batch, statuses);
            for (TreePersonSnapshot person : query.getResultList()) {
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
        if (branchIds == null || branchIds.isEmpty()) {
            return List.of();
        }
        TypedQuery<TreePersonSnapshot> query = entityManager.createQuery(PERSON_READ_SELECT + """
                where p.clanId = :clanId
                  and p.branchId in :branchIds
                  and p.dataStatus in :statuses
                  and p.deletedAt is null
                order by
                  case when p.generationNo is null then 1 else 0 end,
                  p.generationNo, p.personCode, p.id
                """, TreePersonSnapshot.class);
        query.setParameter("clanId", clanId);
        query.setParameter("branchIds", List.copyOf(branchIds));
        query.setParameter("statuses", statuses);
        if (pageable != null) {
            query.setFirstResult(Math.toIntExact(pageable.getOffset()));
            query.setMaxResults(pageable.getPageSize());
        }
        List<TreePersonSnapshot> result = query.getResultList();
        if (pageable == null) {
            result = new ArrayList<>(result);
            result.sort(PERSON_ORDER);
        }
        return List.copyOf(result);
    }

    private void bind(
            TypedQuery<TreePersonSnapshot> query,
            Long clanId,
            Collection<Long> ids,
            Collection<String> statuses
    ) {
        query.setParameter("clanId", clanId);
        query.setParameter("personIds", ids);
        query.setParameter("statuses", statuses);
    }
}
