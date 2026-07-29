package com.genealogy.tree.repository;

import com.genealogy.person.entity.PersonEntity;
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

public class TreePersonQueryRepositoryImpl implements TreePersonQueryRepository {

    private static final Comparator<PersonEntity> PERSON_ORDER = Comparator
            .comparing((PersonEntity person) -> person.getGenerationNo() == null ? Integer.MAX_VALUE : person.getGenerationNo())
            .thenComparing(person -> person.getPersonCode() == null ? "" : person.getPersonCode())
            .thenComparing(person -> person.getId() == null ? Long.MAX_VALUE : person.getId());

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public List<PersonEntity> findTreePeopleByIds(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses
    ) {
        if (personIds == null || personIds.isEmpty()) {
            return List.of();
        }
        Map<Long, PersonEntity> deduplicated = new LinkedHashMap<>();
        for (List<Long> batch : TreeQueryBatcher.partition(personIds, TreeQueryBatcher.DEFAULT_BATCH_SIZE)) {
            TypedQuery<PersonEntity> query = entityManager.createQuery("""
                    select p
                    from PersonEntity p
                    where p.clanId = :clanId
                      and p.id in :personIds
                      and p.dataStatus in :statuses
                      and p.deletedAt is null
                    order by p.id
                    """, PersonEntity.class);
            query.setParameter("clanId", clanId);
            query.setParameter("personIds", batch);
            query.setParameter("statuses", statuses);
            for (PersonEntity person : query.getResultList()) {
                deduplicated.putIfAbsent(person.getId(), person);
            }
        }
        return List.copyOf(deduplicated.values());
    }

    @Override
    public List<PersonEntity> findTreePeopleByBranches(
            Long clanId,
            Collection<Long> branchIds,
            Collection<String> statuses,
            Pageable pageable
    ) {
        if (branchIds == null || branchIds.isEmpty()) {
            return List.of();
        }
        Map<Long, PersonEntity> deduplicated = new LinkedHashMap<>();
        int targetSize = pageable == null ? Integer.MAX_VALUE : pageable.getPageSize();
        for (List<Long> batch : TreeQueryBatcher.partition(branchIds, TreeQueryBatcher.DEFAULT_BATCH_SIZE)) {
            TypedQuery<PersonEntity> query = entityManager.createQuery("""
                    select p
                    from PersonEntity p
                    where p.clanId = :clanId
                      and p.branchId in :branchIds
                      and p.dataStatus in :statuses
                      and p.deletedAt is null
                    order by
                      case when p.generationNo is null then 1 else 0 end,
                      p.generationNo,
                      p.personCode,
                      p.id
                    """, PersonEntity.class);
            query.setParameter("clanId", clanId);
            query.setParameter("branchIds", batch);
            query.setParameter("statuses", statuses);
            if (pageable != null) {
                query.setMaxResults(targetSize);
            }
            for (PersonEntity person : query.getResultList()) {
                deduplicated.putIfAbsent(person.getId(), person);
            }
        }
        List<PersonEntity> result = new ArrayList<>(deduplicated.values());
        result.sort(PERSON_ORDER);
        if (pageable == null) {
            return List.copyOf(result);
        }
        int from = Math.min(Math.toIntExact(pageable.getOffset()), result.size());
        int to = Math.min(from + pageable.getPageSize(), result.size());
        return List.copyOf(result.subList(from, to));
    }
}
