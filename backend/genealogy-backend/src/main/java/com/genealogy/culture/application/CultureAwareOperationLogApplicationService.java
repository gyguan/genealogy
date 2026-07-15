package com.genealogy.culture.application;

import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.entity.MigrationEventEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.culture.repository.MigrationEventRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.repository.OperationLogRepository;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Primary
@Service
public class CultureAwareOperationLogApplicationService extends OperationLogApplicationService {

    private static final Set<String> RESTRICTED_PRIVACY = Set.of("private", "sealed");

    private final CultureItemRepository cultureItemRepository;
    private final MigrationEventRepository migrationEventRepository;

    public CultureAwareOperationLogApplicationService(
            OperationLogRepository operationLogRepository,
            CultureItemRepository cultureItemRepository,
            MigrationEventRepository migrationEventRepository
    ) {
        super(operationLogRepository);
        this.cultureItemRepository = cultureItemRepository;
        this.migrationEventRepository = migrationEventRepository;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(
            Long clanId,
            Long actorId,
            String actionType,
            String targetType,
            Long targetId,
            String summary,
            String detail
    ) {
        record(clanId, actorId, actionType, targetType, targetId, summary, detail, null, null);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(
            Long clanId,
            Long actorId,
            String actionType,
            String targetType,
            Long targetId,
            String summary,
            String detail,
            String requestId,
            String clientIp
    ) {
        String normalizedType = normalize(targetType);
        if (restricted(normalizedType, targetId)) {
            String safeSummary = "migration_event".equals(normalizedType)
                    ? "受限迁徙事件操作"
                    : "受限文化资料操作";
            super.record(
                    clanId,
                    actorId,
                    actionType,
                    targetType,
                    targetId,
                    safeSummary,
                    null,
                    requestId,
                    clientIp
            );
            return;
        }
        super.record(clanId, actorId, actionType, targetType, targetId, summary, detail, requestId, clientIp);
    }

    private boolean restricted(String targetType, Long targetId) {
        if (targetId == null) return true;
        if (CultureItemGovernanceApplicationService.TARGET_TYPE.equals(targetType)) {
            return cultureItemRepository.findById(targetId).map(this::restricted).orElse(true);
        }
        if (MigrationEventGovernanceApplicationService.TARGET_TYPE.equals(targetType)) {
            return migrationEventRepository.findById(targetId).map(this::restricted).orElse(true);
        }
        return false;
    }

    private boolean restricted(CultureItemEntity item) {
        return restricted(item.getPrivacyLevel(), item.getSensitiveLevel());
    }

    private boolean restricted(MigrationEventEntity event) {
        return restricted(event.getPrivacyLevel(), event.getSensitiveLevel());
    }

    private boolean restricted(String privacyValue, String sensitiveValue) {
        String privacy = normalize(privacyValue);
        String sensitive = normalize(sensitiveValue);
        return RESTRICTED_PRIVACY.contains(privacy) || !sensitive.isEmpty() && !"normal".equals(sensitive);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
