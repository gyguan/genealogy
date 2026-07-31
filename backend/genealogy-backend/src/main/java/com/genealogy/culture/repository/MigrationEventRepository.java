package com.genealogy.culture.repository;

import com.genealogy.culture.dto.MigrationEventSearchCriteria;
import com.genealogy.culture.entity.MigrationEventEntity;
import com.genealogy.culture.repository.mybatis.MigrationEventPersistenceMapper;
import com.genealogy.culture.repository.mybatis.MigrationEventQueryMapper;
import com.genealogy.culture.repository.query.MigrationEventSearchRow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@Transactional(readOnly = true)
public class MigrationEventRepository {
    private final MigrationEventPersistenceMapper persistenceMapper;
    private final MigrationEventQueryMapper queryMapper;
    public MigrationEventRepository(MigrationEventPersistenceMapper persistenceMapper, MigrationEventQueryMapper queryMapper) {
        this.persistenceMapper = persistenceMapper; this.queryMapper = queryMapper;
    }
    @Transactional
    public MigrationEventEntity save(MigrationEventEntity entity) {
        Objects.requireNonNull(entity, "entity"); OffsetDateTime now = OffsetDateTime.now();
        if (entity.getId() == null) {
            if (entity.getCreatedAt() == null) entity.setCreatedAt(now);
            entity.setUpdatedAt(now); if (entity.getVersion() == null) entity.setVersion(0L); persistenceMapper.insert(entity);
        } else {
            Long version = entity.getVersion(); if (version == null) throw new IllegalStateException("Migration event version is required");
            entity.setUpdatedAt(now);
            if (persistenceMapper.updateAllByIdAndVersion(entity) != 1) throw new IllegalStateException("Migration event update conflict for id " + entity.getId());
            entity.setVersion(version + 1);
        }
        return entity;
    }
    @Transactional public MigrationEventEntity saveAndFlush(MigrationEventEntity entity) { return save(entity); }
    public Optional<MigrationEventEntity> findByIdAndDeletedAtIsNull(Long id) {
        MigrationEventEntity entity = id == null ? null : persistenceMapper.selectById(id);
        return Optional.ofNullable(entity == null || entity.getDeletedAt() != null ? null : entity);
    }
    public Page<MigrationEventEntity> search(Long clanId, Long actorId, MigrationEventSearchCriteria criteria,
            Collection<Long> readableBranchIds, Collection<Long> sensitiveBranchIds, int pageNo, int pageSize) {
        MigrationEventSearchRow row = new MigrationEventSearchRow(clanId, actorId, criteria.keyword(), criteria.branchIds(),
                criteria.fromLocation(), criteria.toLocation(), criteria.migrationTimeText(), criteria.founderPersonId(),
                criteria.dataStatuses(), criteria.privacyLevel(), safe(readableBranchIds), safe(sensitiveBranchIds),
                criteria.sort() == null ? "sequenceNo,asc" : criteria.sort());
        long total = queryMapper.count(row); PageRequest pageable = PageRequest.of(Math.max(0, pageNo - 1), pageSize);
        return new PageImpl<>(total == 0 ? List.of() : queryMapper.search(row, pageable.getOffset(), pageSize), pageable, total);
    }
    public boolean existsByClanIdAndBranchIdAndSequenceNoAndDeletedAtIsNull(Long clanId, Long branchId, Integer sequenceNo) {
        return queryMapper.existsSequence(clanId, branchId, sequenceNo, null);
    }
    public boolean existsByClanIdAndBranchIdAndSequenceNoAndIdNotAndDeletedAtIsNull(Long clanId, Long branchId, Integer sequenceNo, Long id) {
        return queryMapper.existsSequence(clanId, branchId, sequenceNo, id);
    }
    private Collection<Long> safe(Collection<Long> values) { return values == null ? List.of() : values; }
}
