package com.genealogy.branch.repository;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.mybatis.BranchPersistenceMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.TreeSet;

@Repository
@Transactional(readOnly = true)
public class BranchRepository {

    private static final int ID_BATCH_SIZE = 500;

    private final BranchPersistenceMapper persistenceMapper;

    public BranchRepository(BranchPersistenceMapper persistenceMapper) {
        this.persistenceMapper = persistenceMapper;
    }

    @Transactional
    public BranchEntity save(BranchEntity entity) {
        Objects.requireNonNull(entity, "branch entity");
        if (entity.getId() == null) {
            persistenceMapper.insert(entity);
        } else {
            requireOne(persistenceMapper.updateAllById(entity), entity.getId());
        }
        return entity;
    }

    @Transactional
    public BranchEntity saveAndFlush(BranchEntity entity) {
        return save(entity);
    }

    @Transactional
    public List<BranchEntity> saveAll(Iterable<BranchEntity> entities) {
        List<BranchEntity> saved = new ArrayList<>();
        if (entities != null) {
            for (BranchEntity entity : entities) {
                if (entity != null) {
                    saved.add(save(entity));
                }
            }
        }
        return List.copyOf(saved);
    }

    public Optional<BranchEntity> findById(Long id) {
        return Optional.ofNullable(id == null ? null : persistenceMapper.selectById(id));
    }

    public Optional<BranchEntity> findByIdAndClanId(Long id, Long clanId) {
        if (id == null || clanId == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(persistenceMapper.selectOne(
                Wrappers.<BranchEntity>lambdaQuery()
                        .eq(BranchEntity::getId, id)
                        .eq(BranchEntity::getClanId, clanId)
        ));
    }

    public boolean existsById(Long id) {
        return id != null && persistenceMapper.selectById(id) != null;
    }

    public List<BranchEntity> findAll() {
        return persistenceMapper.selectList(
                Wrappers.<BranchEntity>lambdaQuery().orderByAsc(BranchEntity::getId)
        );
    }

    public List<BranchEntity> findAllById(Iterable<Long> ids) {
        List<Long> values = normalizedIds(ids);
        if (values.isEmpty()) {
            return List.of();
        }
        List<BranchEntity> rows = new ArrayList<>(persistenceMapper.selectBatchIds(values));
        rows.sort(Comparator.comparing(BranchEntity::getId, Comparator.nullsLast(Long::compareTo)));
        return List.copyOf(rows);
    }

    public List<BranchEntity> findByClanIdOrderByLevelAscSortOrderAscIdAsc(Long clanId) {
        return persistenceMapper.selectList(
                Wrappers.<BranchEntity>lambdaQuery()
                        .eq(BranchEntity::getClanId, clanId)
                        .orderByAsc(BranchEntity::getLevel)
                        .orderByAsc(BranchEntity::getSortOrder)
                        .orderByAsc(BranchEntity::getId)
        );
    }

    public boolean existsByClanIdAndBranchName(Long clanId, String branchName) {
        return persistenceMapper.selectCount(
                Wrappers.<BranchEntity>lambdaQuery()
                        .eq(BranchEntity::getClanId, clanId)
                        .eq(BranchEntity::getBranchName, branchName)
        ) > 0;
    }

    public boolean existsByClanIdAndBranchNameAndIdNot(Long clanId, String branchName, Long id) {
        return persistenceMapper.selectCount(
                Wrappers.<BranchEntity>lambdaQuery()
                        .eq(BranchEntity::getClanId, clanId)
                        .eq(BranchEntity::getBranchName, branchName)
                        .ne(id != null, BranchEntity::getId, id)
        ) > 0;
    }

    public boolean existsByClanId(Long clanId) {
        return persistenceMapper.selectCount(
                Wrappers.<BranchEntity>lambdaQuery().eq(BranchEntity::getClanId, clanId)
        ) > 0;
    }

    public long countByClanId(Long clanId) {
        return persistenceMapper.selectCount(
                Wrappers.<BranchEntity>lambdaQuery().eq(BranchEntity::getClanId, clanId)
        );
    }

    public long count() {
        return persistenceMapper.selectCount(null);
    }

    public boolean existsByParentId(Long parentId) {
        return parentId != null && persistenceMapper.selectCount(
                Wrappers.<BranchEntity>lambdaQuery().eq(BranchEntity::getParentId, parentId)
        ) > 0;
    }

    public boolean isDescendantOrSelf(Long clanId, Long ancestorId, Long candidateId) {
        if (clanId == null || ancestorId == null || candidateId == null) {
            return false;
        }
        return persistenceMapper.isDescendantOrSelf(clanId, ancestorId, candidateId);
    }

    public List<Long> findSubtreeIds(Long clanId, Collection<Long> ancestorIds) {
        List<Long> normalized = normalizedIds(ancestorIds);
        if (clanId == null || normalized.isEmpty()) {
            return List.of();
        }
        TreeSet<Long> result = new TreeSet<>();
        for (int start = 0; start < normalized.size(); start += ID_BATCH_SIZE) {
            List<Long> batch = normalized.subList(start, Math.min(start + ID_BATCH_SIZE, normalized.size()));
            result.addAll(persistenceMapper.findSubtreeIds(clanId, batch));
        }
        return List.copyOf(result);
    }

    @Transactional
    public void delete(BranchEntity entity) {
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
    public void deleteAll(Iterable<BranchEntity> entities) {
        if (entities != null) {
            for (BranchEntity entity : entities) {
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
            throw new IllegalStateException("Branch update expected one row for id " + id);
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

    private static List<Long> normalizedIds(Collection<Long> values) {
        return normalizedIds((Iterable<Long>) values);
    }
}
