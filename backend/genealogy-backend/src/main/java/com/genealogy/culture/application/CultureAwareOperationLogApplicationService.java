package com.genealogy.culture.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.governance.CultureTargetContext;
import com.genealogy.culture.governance.CultureTargetGovernanceRegistry;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.repository.OperationLogRepository;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Primary
@Service
public class CultureAwareOperationLogApplicationService extends OperationLogApplicationService {

    private final CultureTargetGovernanceRegistry targetRegistry;

    public CultureAwareOperationLogApplicationService(
            OperationLogRepository operationLogRepository,
            CultureTargetGovernanceRegistry targetRegistry
    ) {
        super(operationLogRepository);
        this.targetRegistry = targetRegistry;
    }

    /*
     * This primary bean overrides the operation-log entry points, so it must keep
     * the same best-effort transaction boundary as the base service. Suspending
     * the caller transaction ensures an audit failure cannot mark culture-item,
     * migration-event or culture-site creation rollback-only.
     */
    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
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
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
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
        CultureTargetContext target = governedTarget(targetType, targetId);
        if (target != null && target.restricted()) {
            super.record(
                    clanId,
                    actorId,
                    actionType,
                    target.targetType(),
                    targetId,
                    target.restrictedLogSummary(),
                    null,
                    requestId,
                    clientIp
            );
            return;
        }
        if (targetRegistry.supports(targetType) && target == null) {
            super.record(
                    clanId,
                    actorId,
                    actionType,
                    targetRegistry.normalizeType(targetType),
                    targetId,
                    "受限文化对象操作",
                    null,
                    requestId,
                    clientIp
            );
            return;
        }
        super.record(clanId, actorId, actionType, targetType, targetId, summary, detail, requestId, clientIp);
    }

    private CultureTargetContext governedTarget(String targetType, Long targetId) {
        if (!targetRegistry.supports(targetType) || targetId == null) return null;
        try {
            return targetRegistry.requireAdapter(targetType).requireExisting(targetId);
        } catch (BusinessException ignored) {
            return null;
        }
    }
}
