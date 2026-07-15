package com.genealogy.operationlog.application;

import com.genealogy.common.api.PageResponse;
import com.genealogy.operationlog.dto.OperationLogResponse;
import com.genealogy.operationlog.dto.RiskAuditEventResponse;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class OperationRiskBusinessViewApplicationService {

    private final OperationLogBusinessViewApplicationService operationLogBusinessViewApplicationService;

    public OperationRiskBusinessViewApplicationService(
            OperationLogBusinessViewApplicationService operationLogBusinessViewApplicationService
    ) {
        this.operationLogBusinessViewApplicationService = operationLogBusinessViewApplicationService;
    }

    public PageResponse<RiskAuditEventResponse> enrich(
            PageResponse<RiskAuditEventResponse> page,
            Long clanId,
            Long actorId
    ) {
        if (page.records().isEmpty()) {
            return page;
        }
        PageResponse<OperationLogResponse> operationPage = PageResponse.of(
                page.records().stream().map(this::toOperationLog).toList(),
                page.total(),
                page.pageNo(),
                page.pageSize()
        );
        PageResponse<OperationLogResponse> enriched = operationLogBusinessViewApplicationService.enrich(
                operationPage,
                clanId,
                actorId
        );
        Map<Long, OperationLogResponse> byId = new LinkedHashMap<>();
        enriched.records().forEach(record -> byId.put(record.id(), record));
        return PageResponse.of(
                page.records().stream().map(risk -> withBusinessView(risk, byId.get(risk.id()))).toList(),
                page.total(),
                page.pageNo(),
                page.pageSize()
        );
    }

    private OperationLogResponse toOperationLog(RiskAuditEventResponse risk) {
        return new OperationLogResponse(
                risk.id(),
                risk.clanId(),
                risk.actorId(),
                null,
                risk.actionType(),
                risk.targetType(),
                risk.targetId(),
                null,
                null,
                null,
                risk.resultStatus(),
                risk.summary(),
                risk.detail(),
                risk.requestId(),
                risk.clientIp(),
                risk.createdAt(),
                risk.traceId(),
                risk.revisionId(),
                risk.reviewTaskId(),
                risk.trackingTargetType(),
                risk.trackingTargetId(),
                risk.resultStatus()
        );
    }

    private RiskAuditEventResponse withBusinessView(
            RiskAuditEventResponse risk,
            OperationLogResponse enriched
    ) {
        if (enriched == null) {
            return risk;
        }
        return new RiskAuditEventResponse(
                risk.id(),
                risk.clanId(),
                risk.actorId(),
                enriched.actorDisplayName(),
                risk.actionType(),
                risk.riskLevel(),
                risk.eventType(),
                risk.dispositionStatus(),
                risk.branchId(),
                risk.targetType(),
                risk.targetId(),
                enriched.targetDisplayName(),
                enriched.targetBranchName(),
                enriched.targetSummary(),
                enriched.resultStatus(),
                risk.summary(),
                risk.detail(),
                risk.requestId(),
                risk.clientIp(),
                risk.createdAt(),
                risk.traceId(),
                risk.revisionId(),
                risk.reviewTaskId(),
                risk.trackingTargetType(),
                risk.trackingTargetId(),
                risk.detailAvailable()
        );
    }
}
