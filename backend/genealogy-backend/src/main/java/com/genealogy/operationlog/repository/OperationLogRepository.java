package com.genealogy.operationlog.repository;

import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.mybatis.OperationLogPersistenceMapper;
import com.genealogy.operationlog.repository.query.OperationLogGroupCountRow;
import com.genealogy.operationlog.repository.query.OperationLogQueryCriteria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Repository
@Transactional(readOnly = true)
public class OperationLogRepository {
    private final OperationLogPersistenceMapper mapper;

    public OperationLogRepository(OperationLogPersistenceMapper mapper) {
        this.mapper = mapper;
    }

    @Transactional
    public OperationLogEntity save(OperationLogEntity entity) {
        Objects.requireNonNull(entity, "entity");
        if (entity.getCreatedAt() == null) {
            entity.setCreatedAt(LocalDateTime.now());
        }
        if (entity.getId() == null) {
            mapper.insert(entity);
        } else if (mapper.updateAllById(entity) != 1) {
            throw new IllegalStateException("Operation log update failed for id " + entity.getId());
        }
        return entity;
    }

    @Transactional
    public OperationLogEntity saveAndFlush(OperationLogEntity entity) {
        return save(entity);
    }

    public Page<OperationLogEntity> search(OperationLogQueryCriteria criteria, Pageable pageable) {
        long total = mapper.count(criteria);
        List<OperationLogEntity> content = total == 0
                ? List.of()
                : mapper.search(criteria, pageable.getOffset(), pageable.getPageSize());
        return new PageImpl<>(content, pageable, total);
    }

    public List<OperationLogEntity> list(OperationLogQueryCriteria criteria, int limit) {
        int normalizedLimit = Math.max(1, limit);
        return mapper.search(criteria, 0L, normalizedLimit);
    }

    public long count(OperationLogQueryCriteria criteria) {
        return mapper.count(criteria);
    }

    public List<OperationLogGroupCountRow> groupByRiskLevel(OperationLogQueryCriteria criteria) {
        return mapper.groupByRiskLevel(criteria);
    }

    public List<OperationLogGroupCountRow> groupByRiskEventType(OperationLogQueryCriteria criteria) {
        return mapper.groupByRiskEventType(criteria);
    }

    public List<OperationLogGroupCountRow> groupByDispositionStatus(OperationLogQueryCriteria criteria) {
        return mapper.groupByDispositionStatus(criteria);
    }

    public Page<OperationLogEntity> findByClanId(Long clanId, Pageable pageable) {
        return search(baseCriteria(clanId, null, null), pageable);
    }

    public Page<OperationLogEntity> findByTargetTypeAndTargetId(String targetType, Long targetId, Pageable pageable) {
        return search(baseCriteria(null, targetType, targetId), pageable);
    }

    private OperationLogQueryCriteria baseCriteria(Long clanId, String targetType, Long targetId) {
        return new OperationLogQueryCriteria(
                clanId,
                List.of(),
                List.of(),
                targetType == null ? List.of() : List.of(targetType),
                targetId,
                List.of(),
                null,
                null,
                null,
                List.of(),
                false,
                List.of(),
                List.of(),
                List.of(),
                false,
                List.of()
        );
    }
}
