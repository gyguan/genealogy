package com.genealogy.relationship.repository;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.genealogy.relationship.domain.RelationshipWritePolicy;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.mybatis.RelationshipPersistenceMapper;
import com.genealogy.tree.query.TreeRelationshipSnapshot;
import com.genealogy.tree.repository.TreeRelationshipQueryRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@Transactional(readOnly = true)
public class RelationshipRepository {

    private final RelationshipPersistenceMapper persistenceMapper;
    private final TreeRelationshipQueryRepository treeQueryRepository;

    public RelationshipRepository(
            RelationshipPersistenceMapper persistenceMapper,
            TreeRelationshipQueryRepository treeQueryRepository
    ) {
        this.persistenceMapper = persistenceMapper;
        this.treeQueryRepository = treeQueryRepository;
    }

    @Transactional
    public RelationshipEntity save(RelationshipEntity entity) {
        Objects.requireNonNull(entity, "relationship entity");
        RelationshipWritePolicy.normalizeForWrite(entity);
        if (entity.getId() == null) {
            persistenceMapper.insert(entity);
        } else {
            requireOne(persistenceMapper.updateAllById(entity), entity.getId());
        }
        return entity;
    }

    @Transactional
    public RelationshipEntity saveAndFlush(RelationshipEntity entity) {
        return save(entity);
    }

    @Transactional
    public List<RelationshipEntity> saveAll(Iterable<RelationshipEntity> entities) {
        List<RelationshipEntity> saved = new ArrayList<>();
        if (entities != null) {
            for (RelationshipEntity entity : entities) {
                if (entity != null) {
                    saved.add(save(entity));
                }
            }
        }
        return List.copyOf(saved);
    }

    public Optional<RelationshipEntity> findById(Long id) {
        return Optional.ofNullable(id == null ? null : persistenceMapper.selectById(id));
    }

    public boolean existsById(Long id) {
        return id != null && persistenceMapper.selectById(id) != null;
    }

    public List<RelationshipEntity> findAll() {
        return persistenceMapper.selectList(
                Wrappers.<RelationshipEntity>lambdaQuery().orderByAsc(RelationshipEntity::getId)
        );
    }

    public List<RelationshipEntity> findAllById(Iterable<Long> ids) {
        List<Long> values = normalizedIds(ids);
        if (values.isEmpty()) {
            return List.of();
        }
        List<RelationshipEntity> rows = new ArrayList<>(persistenceMapper.selectBatchIds(values));
        rows.sort(Comparator.comparing(RelationshipEntity::getId, Comparator.nullsLast(Long::compareTo)));
        return List.copyOf(rows);
    }

    public List<RelationshipEntity> findByFromPersonIdAndDeletedAtIsNull(Long fromPersonId) {
        return persistenceMapper.selectList(
                Wrappers.<RelationshipEntity>lambdaQuery()
                        .eq(RelationshipEntity::getFromPersonId, fromPersonId)
                        .isNull(RelationshipEntity::getDeletedAt)
                        .orderByAsc(RelationshipEntity::getToPersonId)
                        .orderByAsc(RelationshipEntity::getId)
        );
    }

    public List<RelationshipEntity> findByToPersonIdAndDeletedAtIsNull(Long toPersonId) {
        return persistenceMapper.selectList(
                Wrappers.<RelationshipEntity>lambdaQuery()
                        .eq(RelationshipEntity::getToPersonId, toPersonId)
                        .isNull(RelationshipEntity::getDeletedAt)
                        .orderByAsc(RelationshipEntity::getFromPersonId)
                        .orderByAsc(RelationshipEntity::getId)
        );
    }

    public List<RelationshipEntity> findByClanIdAndDeletedAtIsNull(Long clanId) {
        return persistenceMapper.selectList(
                Wrappers.<RelationshipEntity>lambdaQuery()
                        .eq(RelationshipEntity::getClanId, clanId)
                        .isNull(RelationshipEntity::getDeletedAt)
                        .orderByAsc(RelationshipEntity::getFromPersonId)
                        .orderByAsc(RelationshipEntity::getToPersonId)
                        .orderByAsc(RelationshipEntity::getId)
        );
    }

    public Optional<RelationshipEntity> findByIdAndClanIdAndDeletedAtIsNull(Long id, Long clanId) {
        if (id == null || clanId == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(persistenceMapper.selectOne(
                Wrappers.<RelationshipEntity>lambdaQuery()
                        .eq(RelationshipEntity::getId, id)
                        .eq(RelationshipEntity::getClanId, clanId)
                        .isNull(RelationshipEntity::getDeletedAt)
        ));
    }

    public List<RelationshipEntity> findActiveSameRelation(
            Long clanId,
            Long fromId,
            Long toId,
            String type
    ) {
        return persistenceMapper.selectList(
                Wrappers.<RelationshipEntity>lambdaQuery()
                        .eq(RelationshipEntity::getClanId, clanId)
                        .eq(RelationshipEntity::getFromPersonId, fromId)
                        .eq(RelationshipEntity::getToPersonId, toId)
                        .eq(RelationshipEntity::getRelationType, type)
                        .isNull(RelationshipEntity::getDeletedAt)
                        .orderByAsc(RelationshipEntity::getId)
        );
    }

    public List<RelationshipEntity> findActiveToRelations(Long clanId, Long toId, String type) {
        return persistenceMapper.selectList(
                Wrappers.<RelationshipEntity>lambdaQuery()
                        .eq(RelationshipEntity::getClanId, clanId)
                        .eq(RelationshipEntity::getToPersonId, toId)
                        .eq(RelationshipEntity::getRelationType, type)
                        .isNull(RelationshipEntity::getDeletedAt)
                        .orderByAsc(RelationshipEntity::getFromPersonId)
                        .orderByAsc(RelationshipEntity::getId)
        );
    }

    public List<TreeRelationshipSnapshot> findTreeOutgoingSnapshots(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            boolean lineageOnly
    ) {
        return treeQueryRepository.findTreeOutgoingSnapshots(clanId, personIds, statuses, categories, lineageOnly);
    }

    public List<TreeRelationshipSnapshot> findTreeIncomingSnapshots(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            boolean lineageOnly
    ) {
        return treeQueryRepository.findTreeIncomingSnapshots(clanId, personIds, statuses, categories, lineageOnly);
    }

    public List<TreeRelationshipSnapshot> findTreeWithinPeopleSnapshots(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            Pageable pageable
    ) {
        return treeQueryRepository.findTreeWithinPeopleSnapshots(clanId, personIds, statuses, categories, pageable);
    }

    public List<RelationshipEntity> findTreeOutgoing(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            boolean lineageOnly
    ) {
        return findTreeOutgoingSnapshots(clanId, personIds, statuses, categories, lineageOnly).stream()
                .map(TreeRelationshipSnapshot::toDetachedEntity)
                .toList();
    }

    public List<RelationshipEntity> findTreeIncoming(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            boolean lineageOnly
    ) {
        return findTreeIncomingSnapshots(clanId, personIds, statuses, categories, lineageOnly).stream()
                .map(TreeRelationshipSnapshot::toDetachedEntity)
                .toList();
    }

    public List<RelationshipEntity> findTreeWithinPeople(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses,
            Collection<String> categories,
            Pageable pageable
    ) {
        return findTreeWithinPeopleSnapshots(clanId, personIds, statuses, categories, pageable).stream()
                .map(TreeRelationshipSnapshot::toDetachedEntity)
                .toList();
    }

    public long count() {
        return persistenceMapper.selectCount(null);
    }

    @Transactional
    public void delete(RelationshipEntity entity) {
        if (entity != null && entity.getId() != null) {
            persistenceMapper.deleteById(entity.getId());
        }
    }

    @Transactional
    public void deleteById(Long id) {
        if (id != null) {
            persistenceMapper.deleteById(id);
        }
    }

    @Transactional
    public void deleteAll(Iterable<RelationshipEntity> entities) {
        if (entities != null) {
            for (RelationshipEntity entity : entities) {
                delete(entity);
            }
        }
    }

    @Transactional
    public void deleteAllById(Iterable<Long> ids) {
        for (Long id : normalizedIds(ids)) {
            persistenceMapper.deleteById(id);
        }
    }

    public void flush() {
        // MyBatis writes are executed immediately on the transaction-bound SqlSession.
    }

    private static void requireOne(int affected, Long id) {
        if (affected != 1) {
            throw new IllegalStateException("Relationship update expected one row for id " + id);
        }
    }

    private static List<Long> normalizedIds(Iterable<Long> values) {
        LinkedHashSet<Long> ids = new LinkedHashSet<>();
        if (values != null) {
            for (Long value : values) {
                if (value != null) {
                    ids.add(value);
                }
            }
        }
        return List.copyOf(ids);
    }
}
