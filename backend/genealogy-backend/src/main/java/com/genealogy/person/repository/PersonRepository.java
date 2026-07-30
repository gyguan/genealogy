package com.genealogy.person.repository;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.genealogy.common.persistence.PageQuery;
import com.genealogy.common.persistence.PageResult;
import com.genealogy.person.dto.PersonSearchQuery;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.mybatis.PersonPersistenceMapper;
import com.genealogy.person.repository.mybatis.PersonQueryMapper;
import com.genealogy.person.repository.query.PersonDashboardData;
import com.genealogy.person.repository.query.PersonDashboardSummary;
import com.genealogy.person.repository.query.PersonDuplicateCriteria;
import com.genealogy.person.repository.query.PersonSearchCriteria;
import com.genealogy.tree.repository.TreePersonQueryRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * Framework-neutral Person persistence adapter.
 *
 * <p>Simple CRUD is backed by MyBatis-Plus, dynamic searches and dashboard
 * projections use dedicated SQL, and the existing Tree read fragment remains
 * isolated behind {@link TreePersonQueryRepository}.</p>
 */
@Repository
@Transactional(readOnly = true)
public class PersonRepository {

    private static final int ID_BATCH_SIZE = 500;

    private final PersonPersistenceMapper persistenceMapper;
    private final PersonQueryMapper queryMapper;
    private final TreePersonQueryRepository treePersonQueryRepository;

    public PersonRepository(
            PersonPersistenceMapper persistenceMapper,
            PersonQueryMapper queryMapper,
            TreePersonQueryRepository treePersonQueryRepository
    ) {
        this.persistenceMapper = persistenceMapper;
        this.queryMapper = queryMapper;
        this.treePersonQueryRepository = treePersonQueryRepository;
    }

    @Transactional
    public PersonEntity save(PersonEntity entity) {
        Objects.requireNonNull(entity, "entity");
        if (entity.getId() == null) {
            persistenceMapper.insert(entity);
            return entity;
        }
        int updated = persistenceMapper.updateAllById(entity);
        if (updated != 1) {
            throw new IllegalStateException("Person update expected one row for id " + entity.getId());
        }
        return entity;
    }

    /** Compatibility alias: MyBatis statements execute immediately. */
    @Transactional
    public PersonEntity saveAndFlush(PersonEntity entity) {
        return save(entity);
    }

    /**
     * Batch-updates existing Person snapshots in one SQL statement.
     * New rows require {@link #save(PersonEntity)} so PostgreSQL Identity values
     * can be returned deterministically.
     */
    @Transactional
    public List<PersonEntity> saveAll(Iterable<PersonEntity> entities) {
        List<PersonEntity> items = copyEntities(entities);
        if (items.isEmpty()) {
            return List.of();
        }
        Set<Long> ids = new LinkedHashSet<>();
        for (PersonEntity item : items) {
            if (item.getId() == null) {
                throw new IllegalArgumentException("Person saveAll only accepts existing entities; use save for inserts");
            }
            if (!ids.add(item.getId())) {
                throw new IllegalArgumentException("Person saveAll contains duplicate id " + item.getId());
            }
        }
        int updated = 0;
        for (int start = 0; start < items.size(); start += ID_BATCH_SIZE) {
            List<PersonEntity> batch = items.subList(start, Math.min(start + ID_BATCH_SIZE, items.size()));
            updated += persistenceMapper.updateAllBatch(batch);
        }
        if (updated != items.size()) {
            throw new IllegalStateException("Person batch update expected " + items.size() + " rows but updated " + updated);
        }
        return List.copyOf(items);
    }

    public Optional<PersonEntity> findById(Long id) {
        return id == null ? Optional.empty() : Optional.ofNullable(persistenceMapper.selectById(id));
    }

    public Optional<PersonEntity> findByIdAndDeletedAtIsNull(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(persistenceMapper.selectOne(Wrappers.<PersonEntity>lambdaQuery()
                .eq(PersonEntity::getId, id)
                .isNull(PersonEntity::getDeletedAt)));
    }

    public List<PersonEntity> findAllById(Iterable<Long> ids) {
        List<Long> values = distinctIds(ids);
        if (values.isEmpty()) {
            return List.of();
        }
        Map<Long, PersonEntity> deduplicated = new LinkedHashMap<>();
        for (int start = 0; start < values.size(); start += ID_BATCH_SIZE) {
            List<Long> batch = values.subList(start, Math.min(start + ID_BATCH_SIZE, values.size()));
            for (PersonEntity entity : persistenceMapper.selectBatchIds(batch)) {
                deduplicated.putIfAbsent(entity.getId(), entity);
            }
        }
        return List.copyOf(deduplicated.values());
    }

    public List<PersonEntity> findByClanIdAndDeletedAtIsNull(Long clanId) {
        return persistenceMapper.selectList(Wrappers.<PersonEntity>lambdaQuery()
                .eq(PersonEntity::getClanId, clanId)
                .isNull(PersonEntity::getDeletedAt)
                .orderByAsc(PersonEntity::getId));
    }

    public List<PersonEntity> findByClanIdAndBranchIdAndDeletedAtIsNull(Long clanId, Long branchId) {
        return persistenceMapper.selectList(Wrappers.<PersonEntity>lambdaQuery()
                .eq(PersonEntity::getClanId, clanId)
                .eq(PersonEntity::getBranchId, branchId)
                .isNull(PersonEntity::getDeletedAt)
                .orderByAsc(PersonEntity::getId));
    }

    public PageResult<PersonEntity> findPageByClan(Long clanId, PageQuery query) {
        Page<PersonEntity> page = new Page<>(query.pageNo(), query.pageSize());
        persistenceMapper.selectPage(page, Wrappers.<PersonEntity>lambdaQuery()
                .eq(PersonEntity::getClanId, clanId)
                .isNull(PersonEntity::getDeletedAt)
                .orderByDesc(PersonEntity::getId));
        return new PageResult<>(page.getRecords(), page.getTotal());
    }

    public PageResult<PersonEntity> findPageByClanAndBranch(Long clanId, Long branchId, PageQuery query) {
        Page<PersonEntity> page = new Page<>(query.pageNo(), query.pageSize());
        persistenceMapper.selectPage(page, Wrappers.<PersonEntity>lambdaQuery()
                .eq(PersonEntity::getClanId, clanId)
                .eq(PersonEntity::getBranchId, branchId)
                .isNull(PersonEntity::getDeletedAt)
                .orderByDesc(PersonEntity::getId));
        return new PageResult<>(page.getRecords(), page.getTotal());
    }

    public PageResult<PersonEntity> search(PersonSearchQuery query, PageQuery pageQuery) {
        PersonSearchCriteria criteria = PersonSearchCriteria.from(query);
        long total = queryMapper.countSearch(criteria);
        if (total == 0) {
            return new PageResult<>(List.of(), 0);
        }
        long offset = Math.multiplyExact((long) pageQuery.pageNo() - 1, pageQuery.pageSize());
        return new PageResult<>(queryMapper.search(criteria, offset, pageQuery.pageSize()), total);
    }

    public List<PersonEntity> findForExport(PersonSearchQuery query) {
        return List.copyOf(queryMapper.findForExport(PersonSearchCriteria.from(query)));
    }

    public List<PersonEntity> findByClanIdAndPersonCodeAndDeletedAtIsNull(Long clanId, String personCode) {
        if (personCode == null) {
            return List.of();
        }
        return persistenceMapper.selectList(Wrappers.<PersonEntity>lambdaQuery()
                .eq(PersonEntity::getClanId, clanId)
                .eq(PersonEntity::getPersonCode, personCode)
                .isNull(PersonEntity::getDeletedAt)
                .orderByAsc(PersonEntity::getId));
    }

    public boolean existsByClanIdAndPersonCodeAndDeletedAtIsNull(Long clanId, String personCode) {
        return personCode != null && persistenceMapper.selectCount(Wrappers.<PersonEntity>lambdaQuery()
                .eq(PersonEntity::getClanId, clanId)
                .eq(PersonEntity::getPersonCode, personCode)
                .isNull(PersonEntity::getDeletedAt)) > 0;
    }

    public boolean existsByClanIdAndPersonCodeAndIdNotAndDeletedAtIsNull(Long clanId, String personCode, Long id) {
        return personCode != null && persistenceMapper.selectCount(Wrappers.<PersonEntity>lambdaQuery()
                .eq(PersonEntity::getClanId, clanId)
                .eq(PersonEntity::getPersonCode, personCode)
                .ne(id != null, PersonEntity::getId, id)
                .isNull(PersonEntity::getDeletedAt)) > 0;
    }

    public long count() {
        return persistenceMapper.selectCount(Wrappers.<PersonEntity>lambdaQuery());
    }

    public long countDuplicates(
            Long clanId,
            Long branchId,
            String name,
            Integer generationNo,
            String generationWord,
            LocalDate birthDate
    ) {
        return queryMapper.countDuplicates(PersonDuplicateCriteria.of(
                clanId, branchId, name, generationNo, generationWord, birthDate
        ));
    }

    public List<PersonEntity> findDuplicateCandidates(
            Long clanId,
            Long branchId,
            String name,
            Integer generationNo,
            String generationWord,
            LocalDate birthDate,
            int candidateLimit
    ) {
        PersonDuplicateCriteria criteria = PersonDuplicateCriteria.of(
                clanId, branchId, name, generationNo, generationWord, birthDate
        );
        int boundedLimit = Math.max(1, Math.min(candidateLimit, 50));
        return List.copyOf(queryMapper.findDuplicateCandidates(criteria, boundedLimit));
    }

    public PersonDashboardData loadDashboardData(
            Long clanId,
            String dataStatus,
            LocalDateTime trendFrom,
            int recentLimit
    ) {
        PersonDashboardSummary summary = queryMapper.selectDashboardSummary(clanId, dataStatus);
        if (summary == null) {
            summary = new PersonDashboardSummary(0, 0, 0, 0, 0, 0);
        }
        int boundedLimit = Math.max(1, Math.min(recentLimit, 1000));
        return new PersonDashboardData(
                summary,
                queryMapper.selectDashboardBuckets(clanId, dataStatus),
                queryMapper.selectCreatedDaily(clanId, dataStatus, trendFrom),
                queryMapper.selectRecentDashboardPeople(clanId, dataStatus, boundedLimit)
        );
    }

    /** Compatibility adapter for the existing graph policy and assembly chain. */
    public List<PersonEntity> findTreePeopleByIds(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses
    ) {
        return treePersonQueryRepository.findTreePersonSnapshotsByIds(clanId, personIds, statuses).stream()
                .map(snapshot -> snapshot.toDetachedEntity())
                .toList();
    }

    /** Compatibility adapter for the existing bounded branch graph flow. */
    public List<PersonEntity> findTreePeopleByBranches(
            Long clanId,
            Collection<Long> branchIds,
            Collection<String> statuses,
            Pageable pageable
    ) {
        return treePersonQueryRepository.findTreePersonSnapshotsByBranches(clanId, branchIds, statuses, pageable).stream()
                .map(snapshot -> snapshot.toDetachedEntity())
                .toList();
    }

    private List<PersonEntity> copyEntities(Iterable<PersonEntity> entities) {
        Objects.requireNonNull(entities, "entities");
        List<PersonEntity> items = new ArrayList<>();
        for (PersonEntity entity : entities) {
            items.add(Objects.requireNonNull(entity, "entity"));
        }
        return items;
    }

    private List<Long> distinctIds(Iterable<Long> ids) {
        if (ids == null) {
            return List.of();
        }
        Set<Long> values = new LinkedHashSet<>();
        for (Long id : ids) {
            if (id != null) {
                values.add(id);
            }
        }
        return List.copyOf(values);
    }
}
