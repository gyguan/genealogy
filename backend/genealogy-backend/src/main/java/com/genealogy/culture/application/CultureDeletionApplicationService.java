package com.genealogy.culture.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CultureItemDomainService;
import com.genealogy.culture.domain.CultureSiteDomainService;
import com.genealogy.culture.domain.MigrationEventDomainService;
import com.genealogy.culture.dto.CultureCommandResponse;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.entity.CultureSiteEntity;
import com.genealogy.culture.entity.MigrationEventEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.culture.repository.CultureSiteRepository;
import com.genealogy.culture.repository.MigrationEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CultureDeletionApplicationService {

    private final CultureItemApplicationService cultureItemApplicationService;
    private final CultureItemRepository cultureItemRepository;
    private final CultureItemDomainService cultureItemDomainService;
    private final MigrationEventApplicationService migrationEventApplicationService;
    private final MigrationEventRepository migrationEventRepository;
    private final MigrationEventDomainService migrationEventDomainService;
    private final CultureSiteApplicationService cultureSiteApplicationService;
    private final CultureSiteRepository cultureSiteRepository;
    private final CultureSiteDomainService cultureSiteDomainService;

    public CultureDeletionApplicationService(
            CultureItemApplicationService cultureItemApplicationService,
            CultureItemRepository cultureItemRepository,
            CultureItemDomainService cultureItemDomainService,
            MigrationEventApplicationService migrationEventApplicationService,
            MigrationEventRepository migrationEventRepository,
            MigrationEventDomainService migrationEventDomainService,
            CultureSiteApplicationService cultureSiteApplicationService,
            CultureSiteRepository cultureSiteRepository,
            CultureSiteDomainService cultureSiteDomainService
    ) {
        this.cultureItemApplicationService = cultureItemApplicationService;
        this.cultureItemRepository = cultureItemRepository;
        this.cultureItemDomainService = cultureItemDomainService;
        this.migrationEventApplicationService = migrationEventApplicationService;
        this.migrationEventRepository = migrationEventRepository;
        this.migrationEventDomainService = migrationEventDomainService;
        this.cultureSiteApplicationService = cultureSiteApplicationService;
        this.cultureSiteRepository = cultureSiteRepository;
        this.cultureSiteDomainService = cultureSiteDomainService;
    }

    @Transactional
    public CultureCommandResponse deleteCultureItem(
            Long cultureItemId,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        cultureItemApplicationService.getDetail(cultureItemId, actorId);
        CultureItemEntity entity = cultureItemRepository.findByIdAndDeletedAtIsNull(cultureItemId)
                .orElseThrow(() -> new BusinessException("CULTURE_ITEM_NOT_FOUND", "文化资料不存在或不可见"));
        cultureItemDomainService.requireDirectlyDeletable(entity);
        return cultureItemApplicationService.delete(cultureItemId, actorId, requestId, clientIp);
    }

    @Transactional
    public CultureCommandResponse deleteMigrationEvent(
            Long migrationEventId,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        migrationEventApplicationService.getDetail(migrationEventId, actorId);
        MigrationEventEntity entity = migrationEventRepository.findByIdAndDeletedAtIsNull(migrationEventId)
                .orElseThrow(() -> new BusinessException("MIGRATION_EVENT_NOT_FOUND", "迁徙事件不存在或不可见"));
        if (!MigrationEventDomainService.STATUS_OFFICIAL.equals(
                migrationEventDomainService.normalizeStatus(entity.getDataStatus()))) {
            migrationEventDomainService.requireDirectlyDeletable(entity);
        }
        return migrationEventApplicationService.delete(migrationEventId, actorId, requestId, clientIp);
    }

    @Transactional
    public CultureCommandResponse deleteCultureSite(
            Long cultureSiteId,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        cultureSiteApplicationService.getDetail(cultureSiteId, actorId);
        CultureSiteEntity entity = cultureSiteRepository.findByIdAndDeletedAtIsNull(cultureSiteId)
                .orElseThrow(() -> new BusinessException("CULTURE_SITE_NOT_FOUND", "文化场所不存在或不可见"));
        if (!CultureSiteDomainService.STATUS_OFFICIAL.equals(
                cultureSiteDomainService.normalizeStatus(entity.getDataStatus()))) {
            cultureSiteDomainService.requireDirectlyDeletable(entity);
        }
        return cultureSiteApplicationService.delete(cultureSiteId, actorId, requestId, clientIp);
    }
}
