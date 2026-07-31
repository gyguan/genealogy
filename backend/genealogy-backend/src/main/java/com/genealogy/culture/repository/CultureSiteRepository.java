package com.genealogy.culture.repository;

import com.genealogy.culture.dto.CultureSiteSearchCriteria;
import com.genealogy.culture.entity.CultureSiteEntity;
import com.genealogy.culture.repository.mybatis.CultureSitePersistenceMapper;
import com.genealogy.culture.repository.mybatis.CultureSiteQueryMapper;
import com.genealogy.culture.repository.query.CultureSiteSearchRow;
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
public class CultureSiteRepository {
    private final CultureSitePersistenceMapper persistenceMapper;
    private final CultureSiteQueryMapper queryMapper;
    public CultureSiteRepository(CultureSitePersistenceMapper persistenceMapper, CultureSiteQueryMapper queryMapper) {
        this.persistenceMapper = persistenceMapper; this.queryMapper = queryMapper;
    }
    @Transactional
    public CultureSiteEntity save(CultureSiteEntity entity) {
        Objects.requireNonNull(entity, "entity"); OffsetDateTime now = OffsetDateTime.now();
        if (entity.getId() == null) {
            if (entity.getCreatedAt() == null) entity.setCreatedAt(now);
            entity.setUpdatedAt(now); if (entity.getVersion() == null) entity.setVersion(0L); persistenceMapper.insert(entity);
        } else {
            Long version = entity.getVersion(); if (version == null) throw new IllegalStateException("Culture site version is required");
            entity.setUpdatedAt(now);
            if (persistenceMapper.updateAllByIdAndVersion(entity) != 1) throw new IllegalStateException("Culture site update conflict for id " + entity.getId());
            entity.setVersion(version + 1);
        }
        return entity;
    }
    @Transactional public CultureSiteEntity saveAndFlush(CultureSiteEntity entity) { return save(entity); }
    public Optional<CultureSiteEntity> findByIdAndDeletedAtIsNull(Long id) {
        CultureSiteEntity entity = id == null ? null : persistenceMapper.selectById(id);
        return Optional.ofNullable(entity == null || entity.getDeletedAt() != null ? null : entity);
    }
    public Page<CultureSiteEntity> search(Long clanId, Long actorId, CultureSiteSearchCriteria criteria,
            boolean readFullClan, Collection<Long> readBranchIds,
            boolean sensitiveFullClan, Collection<Long> sensitiveBranchIds, int pageNo, int pageSize) {
        CultureSiteSearchRow row = new CultureSiteSearchRow(clanId, actorId, criteria.keyword(), criteria.siteTypes(), criteria.branchIds(),
                criteria.addressText(), criteria.foundedPeriod(), criteria.currentStatus(), criteria.relatedPersonId(), criteria.dataStatuses(),
                criteria.privacyLevel(), criteria.featuredOnHome(), readFullClan, safe(readBranchIds), sensitiveFullClan,
                safe(sensitiveBranchIds), criteria.sort() == null ? "sortOrder,asc" : criteria.sort());
        long total = queryMapper.count(row); PageRequest pageable = PageRequest.of(Math.max(0, pageNo - 1), pageSize);
        return new PageImpl<>(total == 0 ? List.of() : queryMapper.search(row, pageable.getOffset(), pageSize), pageable, total);
    }
    private Collection<Long> safe(Collection<Long> values) { return values == null ? List.of() : values; }
}
