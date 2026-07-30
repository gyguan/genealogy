package com.genealogy.clan.repository;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.mybatis.ClanPersistenceMapper;
import com.genealogy.common.persistence.PageQuery;
import com.genealogy.common.persistence.PageResult;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Framework-neutral Clan persistence port backed by MyBatis-Plus.
 *
 * <p>The application layer depends on this adapter rather than BaseMapper or
 * MyBatis-Plus wrappers. Statements execute immediately and participate in the
 * surrounding Spring transaction.</p>
 */
@Repository
public class ClanRepository {

    private final ClanPersistenceMapper mapper;

    public ClanRepository(ClanPersistenceMapper mapper) {
        this.mapper = mapper;
    }

    public ClanEntity save(ClanEntity entity) {
        Objects.requireNonNull(entity, "entity");
        if (entity.getId() == null) {
            mapper.insert(entity);
            return entity;
        }
        int updated = mapper.updateAllById(entity);
        if (updated != 1) {
            throw new IllegalStateException("Clan update expected one row for id " + entity.getId());
        }
        return entity;
    }

    /** Compatibility alias for existing integration fixtures; MyBatis writes immediately. */
    public ClanEntity saveAndFlush(ClanEntity entity) {
        return save(entity);
    }

    public List<ClanEntity> saveAll(Iterable<ClanEntity> entities) {
        List<ClanEntity> saved = new ArrayList<>();
        for (ClanEntity entity : entities) {
            saved.add(save(entity));
        }
        return List.copyOf(saved);
    }

    public Optional<ClanEntity> findById(Long id) {
        return Optional.ofNullable(mapper.selectById(id));
    }

    public List<ClanEntity> findAllById(Iterable<Long> ids) {
        List<Long> values = new ArrayList<>();
        ids.forEach(values::add);
        if (values.isEmpty()) {
            return List.of();
        }
        return mapper.selectList(Wrappers.<ClanEntity>lambdaQuery()
                .in(ClanEntity::getId, values)
                .orderByAsc(ClanEntity::getId));
    }

    public boolean existsById(Long id) {
        return id != null && mapper.selectCount(Wrappers.<ClanEntity>lambdaQuery()
                .eq(ClanEntity::getId, id)) > 0;
    }

    public List<ClanEntity> findAll() {
        return mapper.selectList(Wrappers.<ClanEntity>lambdaQuery()
                .orderByAsc(ClanEntity::getId));
    }

    public PageResult<ClanEntity> findPage(PageQuery query) {
        Page<ClanEntity> page = new Page<>(query.pageNo(), query.pageSize());
        mapper.selectPage(page, Wrappers.<ClanEntity>lambdaQuery()
                .orderByDesc(ClanEntity::getId));
        return new PageResult<>(page.getRecords(), page.getTotal());
    }

    public long count() {
        return mapper.selectCount(Wrappers.emptyWrapper());
    }

    public void delete(ClanEntity entity) {
        Objects.requireNonNull(entity, "entity");
        deleteById(entity.getId());
    }

    public void deleteById(Long id) {
        if (id != null) {
            mapper.deleteById(id);
        }
    }

    public void deleteAll(Iterable<ClanEntity> entities) {
        List<Long> ids = new ArrayList<>();
        for (ClanEntity entity : entities) {
            if (entity != null && entity.getId() != null) {
                ids.add(entity.getId());
            }
        }
        if (!ids.isEmpty()) {
            mapper.deleteByIds(ids);
        }
    }

    public void deleteAll() {
        mapper.delete(Wrappers.emptyWrapper());
    }

    /** Compatibility no-op: MyBatis statements are not deferred in a persistence context. */
    public void flush() {
        // No deferred persistence context to flush.
    }

    public boolean existsByClanCode(String clanCode) {
        return clanCode != null && mapper.selectCount(Wrappers.<ClanEntity>lambdaQuery()
                .eq(ClanEntity::getClanCode, clanCode)) > 0;
    }

    public boolean existsByClanCodeAndIdNot(String clanCode, Long id) {
        return clanCode != null && mapper.selectCount(Wrappers.<ClanEntity>lambdaQuery()
                .eq(ClanEntity::getClanCode, clanCode)
                .ne(id != null, ClanEntity::getId, id)) > 0;
    }

    public List<ClanEntity> findByIdInOrderByIdDesc(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return mapper.selectList(Wrappers.<ClanEntity>lambdaQuery()
                .in(ClanEntity::getId, ids)
                .orderByDesc(ClanEntity::getId));
    }
}
