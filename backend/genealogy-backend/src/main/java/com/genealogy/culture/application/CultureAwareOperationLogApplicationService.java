package com.genealogy.culture.application;

import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.repository.CultureItemRepository;
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

    public CultureAwareOperationLogApplicationService(
            OperationLogRepository operationLogRepository,
            CultureItemRepository cultureItemRepository
    ) {
        super(operationLogRepository);
        this.cultureItemRepository = cultureItemRepository;
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
        if (CultureItemGovernanceApplicationService.TARGET_TYPE.equals(normalize(targetType))
                && restricted(targetId)) {
            super.record(
                    clanId,
                    actorId,
                    actionType,
                    targetType,
                    targetId,
                    "受限文化资料操作",
                    null,
                    requestId,
                    clientIp
            );
            return;
        }
        super.record(clanId, actorId, actionType, targetType, targetId, summary, detail, requestId, clientIp);
    }

    private boolean restricted(Long targetId) {
        if (targetId == null) return true;
        return cultureItemRepository.findById(targetId)
                .map(this::restricted)
                .orElse(true);
    }

    private boolean restricted(CultureItemEntity item) {
        String privacy = normalize(item.getPrivacyLevel());
        String sensitive = normalize(item.getSensitiveLevel());
        return RESTRICTED_PRIVACY.contains(privacy) || !sensitive.isEmpty() && !"normal".equals(sensitive);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
