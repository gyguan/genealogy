package com.genealogy.culture.repository;

import com.genealogy.culture.entity.CultureRevisionPayloadEntity;
import com.genealogy.culture.repository.mybatis.CultureRevisionPayloadPersistenceMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;

@Repository
@Transactional(readOnly = true)
public class CultureRevisionPayloadRepository {
    private final CultureRevisionPayloadPersistenceMapper mapper;
    public CultureRevisionPayloadRepository(CultureRevisionPayloadPersistenceMapper mapper) { this.mapper = mapper; }
    @Transactional
    public CultureRevisionPayloadEntity save(CultureRevisionPayloadEntity entity) {
        Objects.requireNonNull(entity, "entity");
        if (entity.getCreatedAt() == null) entity.setCreatedAt(LocalDateTime.now());
        if (mapper.selectById(entity.getRevisionId()) == null) mapper.insert(entity);
        else if (mapper.updateAllById(entity) != 1) throw new IllegalStateException("Culture revision payload update failed for revision " + entity.getRevisionId());
        return entity;
    }
    public Optional<CultureRevisionPayloadEntity> findById(Long revisionId) { return Optional.ofNullable(revisionId == null ? null : mapper.selectById(revisionId)); }
    @Transactional public void deleteById(Long revisionId) { if (revisionId != null) mapper.deleteById(revisionId); }
}
