package com.genealogy.culture.repository;

import com.genealogy.culture.dto.CultureItemSearchCriteria;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.repository.mybatis.CultureItemPersistenceMapper;
import com.genealogy.culture.repository.mybatis.CultureItemQueryMapper;
import com.genealogy.culture.repository.query.CultureItemSearchRow;
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
public class CultureItemRepository {
    private final CultureItemPersistenceMapper persistenceMapper;
    private final CultureItemQueryMapper queryMapper;

    public CultureItemRepository(
            CultureItemPersistenceMapper persistenceMapper,
            CultureItemQueryMapper queryMapper
    ) {
        this.persistenceMapper = persistenceMapper;
        this.queryMapper = queryMapper;
    }

    @Transactional
    public CultureItemEntity save(CultureItemEntity entity) {
        Objects.requireNonNull(entity, "entity");
        OffsetDateTime now = OffsetDateTime.now();
        if (entity.getId() == null) {
            if (entity.getCreatedAt() == null) {
                entity.setCreatedAt(now);
            }
            entity.setUpdatedAt(now);
            if (entity.getVersion() == null) {
                entity.setVersion(0L);
            }
            persistenceMapper.insert(entity);
        } else {
            Long expectedVersion = entity.getVersion();
            if (expectedVersion == null) {
                throw new IllegalStateException("Culture item version is required");
            }
            entity.setUpdatedAt(now);
            if (persistenceMapper.updateAllByIdAndVersion(entity) != 1) {
                throw new IllegalStateException(
                        "Culture item update conflict for id " + entity.getId()
                );
            }
            entity.setVersion(expectedVersion + 1);
        }
        return entity;
    }

    @Transactional
    public CultureItemEntity saveAndFlush(CultureItemEntity entity) {
        return save(entity);
    }

    public Optional<CultureItemEntity> findByIdAndDeletedAtIsNull(Long id) {
        CultureItemEntity entity = id == null ? null : persistenceMapper.selectById(id);
        return Optional.ofNullable(
                entity == null || entity.getDeletedAt() != null ? null : entity
        );
    }

    public Page<CultureItemEntity> search(
            Long clanId,
            Long actorId,
            CultureItemSearchCriteria criteria,
            boolean readFullClan,
            Collection<Long> readBranchIds,
            boolean updateFullClan,
            Collection<Long> updateBranchIds,
            int pageNo,
            int pageSize
    ) {
        CultureItemSearchRow row = row(
                clanId,
                actorId,
                criteria,
                readFullClan,
                readBranchIds,
                updateFullClan,
                updateBranchIds
        );
        long total = queryMapper.count(row);
        PageRequest pageable = PageRequest.of(Math.max(0, pageNo - 1), pageSize);
        List<CultureItemEntity> content = total == 0
                ? List.of()
                : queryMapper.search(row, pageable.getOffset(), pageSize);
        return new PageImpl<>(content, pageable, total);
    }

    public long count(
            Long clanId,
            Long actorId,
            CultureItemSearchCriteria criteria,
            boolean readFullClan,
            Collection<Long> readBranchIds,
            boolean updateFullClan,
            Collection<Long> updateBranchIds
    ) {
        return queryMapper.count(row(
                clanId,
                actorId,
                criteria,
                readFullClan,
                readBranchIds,
                updateFullClan,
                updateBranchIds
        ));
    }

    private CultureItemSearchRow row(
            Long clanId,
            Long actorId,
            CultureItemSearchCriteria criteria,
            boolean readFullClan,
            Collection<Long> readBranchIds,
            boolean updateFullClan,
            Collection<Long> updateBranchIds
    ) {
        Boolean hasSource = criteria.hasSourceValues().size() == 1
                ? criteria.hasSourceValues().get(0)
                : null;
        Boolean featured = criteria.featuredOnHomeValues().size() == 1
                ? criteria.featuredOnHomeValues().get(0)
                : null;
        String sort = criteria.sort() == null ? "updatedAt,desc" : criteria.sort();
        return new CultureItemSearchRow(
                clanId,
                actorId,
                criteria.keyword(),
                criteria.categories(),
                criteria.branchIds(),
                criteria.dataStatuses(),
                criteria.privacyLevels(),
                hasSource,
                featured,
                readFullClan,
                safe(readBranchIds),
                updateFullClan,
                safe(updateBranchIds),
                sort
        );
    }

    private Collection<Long> safe(Collection<Long> values) {
        return values == null ? List.of() : values;
    }
}
