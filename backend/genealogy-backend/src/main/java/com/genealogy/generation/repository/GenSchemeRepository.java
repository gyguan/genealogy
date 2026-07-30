package com.genealogy.generation.repository;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.repository.mybatis.GenSchemePersistenceMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/** Framework-neutral Generation Scheme persistence adapter. */
@Repository
@Transactional(readOnly = true)
public class GenSchemeRepository {

    private final GenSchemePersistenceMapper mapper;

    public GenSchemeRepository(GenSchemePersistenceMapper mapper) {
        this.mapper = mapper;
    }

    @Transactional
    public GenerationSchemeEntity save(GenerationSchemeEntity entity) {
        Objects.requireNonNull(entity, "entity");
        if (entity.getId() == null) {
            mapper.insert(entity);
            return entity;
        }
        int updated = mapper.updateAllById(entity);
        if (updated != 1) {
            throw new IllegalStateException("Generation Scheme update expected one row for id " + entity.getId());
        }
        return entity;
    }

    @Transactional
    public GenerationSchemeEntity saveAndFlush(GenerationSchemeEntity entity) {
        return save(entity);
    }

    @Transactional
    public List<GenerationSchemeEntity> saveAll(Iterable<GenerationSchemeEntity> entities) {
        List<GenerationSchemeEntity> saved = new ArrayList<>();
        for (GenerationSchemeEntity entity : entities) {
            saved.add(save(entity));
        }
        return List.copyOf(saved);
    }

    public Optional<GenerationSchemeEntity> findById(Long id) {
        return Optional.ofNullable(mapper.selectById(id));
    }

    public List<GenerationSchemeEntity> findAllById(Iterable<Long> ids) {
        List<Long> values = new ArrayList<>();
        ids.forEach(values::add);
        if (values.isEmpty()) {
            return List.of();
        }
        return mapper.selectList(Wrappers.<GenerationSchemeEntity>lambdaQuery()
                .in(GenerationSchemeEntity::getId, values)
                .orderByAsc(GenerationSchemeEntity::getId));
    }

    public boolean existsById(Long id) {
        return id != null && mapper.selectCount(Wrappers.<GenerationSchemeEntity>lambdaQuery()
                .eq(GenerationSchemeEntity::getId, id)) > 0;
    }

    public List<GenerationSchemeEntity> findAll() {
        return mapper.selectList(Wrappers.<GenerationSchemeEntity>lambdaQuery()
                .orderByAsc(GenerationSchemeEntity::getId));
    }

    public List<GenerationSchemeEntity> findByClanIdOrderByIsDefaultDescIdAsc(Long clanId) {
        return mapper.selectList(Wrappers.<GenerationSchemeEntity>lambdaQuery()
                .eq(GenerationSchemeEntity::getClanId, clanId)
                .orderByDesc(GenerationSchemeEntity::getIsDefault)
                .orderByAsc(GenerationSchemeEntity::getId));
    }

    @Transactional
    public void delete(GenerationSchemeEntity entity) {
        Objects.requireNonNull(entity, "entity");
        deleteById(entity.getId());
    }

    @Transactional
    public void deleteById(Long id) {
        if (id != null) {
            mapper.deleteById(id);
        }
    }

    @Transactional
    public void deleteAll(Iterable<GenerationSchemeEntity> entities) {
        List<Long> ids = new ArrayList<>();
        for (GenerationSchemeEntity entity : entities) {
            if (entity != null && entity.getId() != null) {
                ids.add(entity.getId());
            }
        }
        if (!ids.isEmpty()) {
            mapper.deleteByIds(ids);
        }
    }

    @Transactional
    public void deleteAll() {
        mapper.delete(Wrappers.emptyWrapper());
    }

    public void flush() {
        // MyBatis statements execute immediately.
    }
}
