package com.genealogy.tree.repository;

import com.genealogy.person.entity.PersonEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tree-specific read repository. Queries only fields needed by graph rendering,
 * visibility and deterministic ordering, then maps them to detached read snapshots.
 */
public class TreePersonQueryRepositoryImpl implements TreePersonQueryRepository {

    private static final Comparator<PersonEntity> PERSON_ORDER = Comparator
            .comparing((PersonEntity person) -> person.getGenerationNo() == null ? Integer.MAX_VALUE : person.getGenerationNo())
            .thenComparing(person -> person.getPersonCode() == null ? "" : person.getPersonCode())
            .thenComparing(person -> person.getId() == null ? Long.MAX_VALUE : person.getId());

    private static final String PERSON_READ_SELECT = """
            select p.id, p.clanId, p.branchId, p.personCode, p.name,
                   p.genealogyName, p.courtesyName, p.aliasName, p.gender,
                   p.generationNo, p.generationWord, p.rankInFamily,
                   p.birthDate, p.birthDatePrecision, p.deathDate, p.deathDatePrecision,
                   p.isLiving, p.birthPlace, p.residencePlace, p.occupation,
                   p.education, p.titleOrHonor, p.biography, p.tombPlace, p.epitaph,
                   p.hasDescendant, p.lineageStatus, p.privacyLevel, p.dataStatus,
                   p.createdBy, p.updatedBy
            from PersonEntity p
            """;

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
            Query query = entityManager.createQuery(PERSON_READ_SELECT + """
                    where p.clanId = :clanId
                      and p.id in :personIds
                      and p.dataStatus in :statuses
                      and p.deletedAt is null
                    order by p.id
                    """);
            bind(query, clanId, batch, statuses);
            for (Object[] row : rows(query)) {
                PersonEntity person = snapshot(row);
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
            Query query = entityManager.createQuery(PERSON_READ_SELECT + """
                    where p.clanId = :clanId
                      and p.branchId in :branchIds
                      and p.dataStatus in :statuses
                      and p.deletedAt is null
                    order by
                      case when p.generationNo is null then 1 else 0 end,
                      p.generationNo, p.personCode, p.id
                    """);
            query.setParameter("clanId", clanId);
            query.setParameter("branchIds", batch);
            query.setParameter("statuses", statuses);
            if (pageable != null) {
                query.setMaxResults(targetSize);
            }
            for (Object[] row : rows(query)) {
                PersonEntity person = snapshot(row);
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

    private void bind(Query query, Long clanId, Collection<Long> ids, Collection<String> statuses) {
        query.setParameter("clanId", clanId);
        query.setParameter("personIds", ids);
        query.setParameter("statuses", statuses);
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> rows(Query query) {
        return (List<Object[]>) query.getResultList();
    }

    private PersonEntity snapshot(Object[] row) {
        PersonEntity person = new PersonEntity();
        int i = 0;
        person.setId((Long) row[i++]);
        person.setClanId((Long) row[i++]);
        person.setBranchId((Long) row[i++]);
        person.setPersonCode((String) row[i++]);
        person.setName((String) row[i++]);
        person.setGenealogyName((String) row[i++]);
        person.setCourtesyName((String) row[i++]);
        person.setAliasName((String) row[i++]);
        person.setGender((String) row[i++]);
        person.setGenerationNo((Integer) row[i++]);
        person.setGenerationWord((String) row[i++]);
        person.setRankInFamily((String) row[i++]);
        person.setBirthDate((LocalDate) row[i++]);
        person.setBirthDatePrecision((String) row[i++]);
        person.setDeathDate((LocalDate) row[i++]);
        person.setDeathDatePrecision((String) row[i++]);
        person.setIsLiving((Boolean) row[i++]);
        person.setBirthPlace((String) row[i++]);
        person.setResidencePlace((String) row[i++]);
        person.setOccupation((String) row[i++]);
        person.setEducation((String) row[i++]);
        person.setTitleOrHonor((String) row[i++]);
        person.setBiography((String) row[i++]);
        person.setTombPlace((String) row[i++]);
        person.setEpitaph((String) row[i++]);
        person.setHasDescendant((Boolean) row[i++]);
        person.setLineageStatus((String) row[i++]);
        person.setPrivacyLevel((String) row[i++]);
        person.setDataStatus((String) row[i++]);
        person.setCreatedBy((Long) row[i++]);
        person.setUpdatedBy((Long) row[i]);
        return person;
    }
}
