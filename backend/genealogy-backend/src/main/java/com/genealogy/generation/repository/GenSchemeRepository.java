package com.genealogy.generation.repository;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.repository.mybatis.GenSchemePersistenceMapper;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/** Framework-neutral Generation Scheme persistence adapter. */
@Repository
public class GenSchemeRepository {

    private final GenSchemePersistenceMapper mapper;

    public GenSchemeRepository(GenSchemePersistenceMapper mapper) {
        this.mapper = mapper;
    }

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

    public GenerationSchemeEntity saveAndFlush(GenerationSchemeEntity entity) {
        return save(entity);
    }

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

    public void delete(GenerationSchemeEntity entity) {
        Objects.requireNonNull(entity, "entity");
        deleteById(entity.getId());
    }

    public void deleteById(Long id) {
        if (id != null) {
            mapper.deleteById(id);
        }
    }

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

    public void deleteAll() {
        mapper.delete(Wrappers.emptyWrapper());
    }

    public void flush() {
        // MyBatis statements execute immediately.
    }
}
