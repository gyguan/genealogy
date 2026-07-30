package com.genealogy.generation.repository;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.genealogy.generation.entity.GenerationWordEntity;
import com.genealogy.generation.repository.mybatis.GenWordPersistenceMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/** Framework-neutral Generation Word persistence adapter. */
@Repository
@Transactional(readOnly = true)
public class GenWordRepository {

    private final GenWordPersistenceMapper mapper;

    public GenWordRepository(GenWordPersistenceMapper mapper) {
        this.mapper = mapper;
    }

    @Transactional
    public GenerationWordEntity save(GenerationWordEntity entity) {
        Objects.requireNonNull(entity, "entity");
        if (entity.getId() == null) {
            mapper.insert(entity);
            return entity;
        }
        int updated = mapper.updateAllById(entity);
        if (updated != 1) {
            throw new IllegalStateException("Generation Word update expected one row for id " + entity.getId());
        }
        return entity;
    }

    @Transactional
    public GenerationWordEntity saveAndFlush(GenerationWordEntity entity) {
        return save(entity);
    }

    /**
     * Persists the bounded scheme item collection in caller order. Each insert
     * receives its PostgreSQL Identity value and participates in the caller's
     * Spring transaction.
     */
    @Transactional
    public List<GenerationWordEntity> saveAll(Iterable<GenerationWordEntity> entities) {
        List<GenerationWordEntity> saved = new ArrayList<>();
        for (GenerationWordEntity entity : entities) {
            saved.add(save(entity));
        }
        return List.copyOf(saved);
    }

    public Optional<GenerationWordEntity> findById(Long id) {
        return Optional.ofNullable(mapper.selectById(id));
    }

    public List<GenerationWordEntity> findAll() {
        return mapper.selectList(Wrappers.<GenerationWordEntity>lambdaQuery()
                .orderByAsc(GenerationWordEntity::getId));
    }

    public List<GenerationWordEntity> findBySchemeIdOrderByGenerationNoAsc(Long schemeId) {
        return mapper.selectList(Wrappers.<GenerationWordEntity>lambdaQuery()
                .eq(GenerationWordEntity::getSchemeId, schemeId)
                .orderByAsc(GenerationWordEntity::getGenerationNo)
                .orderByAsc(GenerationWordEntity::getId));
    }

    public Optional<GenerationWordEntity> findBySchemeIdAndGenerationNo(Long schemeId, Integer generationNo) {
        return Optional.ofNullable(mapper.selectOne(Wrappers.<GenerationWordEntity>lambdaQuery()
                .eq(GenerationWordEntity::getSchemeId, schemeId)
                .eq(GenerationWordEntity::getGenerationNo, generationNo)));
    }

    public boolean existsBySchemeIdAndGenerationNo(Long schemeId, Integer generationNo) {
        return mapper.selectCount(Wrappers.<GenerationWordEntity>lambdaQuery()
                .eq(GenerationWordEntity::getSchemeId, schemeId)
                .eq(GenerationWordEntity::getGenerationNo, generationNo)) > 0;
    }

    @Transactional
    public void deleteBySchemeId(Long schemeId) {
        mapper.delete(Wrappers.<GenerationWordEntity>lambdaQuery()
                .eq(GenerationWordEntity::getSchemeId, schemeId));
    }

    @Transactional
    public void delete(GenerationWordEntity entity) {
        Objects.requireNonNull(entity, "entity");
        if (entity.getId() != null) {
            mapper.deleteById(entity.getId());
        }
    }

    @Transactional
    public void deleteAll(Iterable<GenerationWordEntity> entities) {
        List<Long> ids = new ArrayList<>();
        for (GenerationWordEntity entity : entities) {
            if (entity != null && entity.getId() != null) {
                ids.add(entity.getId());
            }
        }
        if (!ids.isEmpty()) {
            mapper.deleteByIds(ids);
        }
    }

    public void flush() {
        // MyBatis statements execute immediately.
    }
}
