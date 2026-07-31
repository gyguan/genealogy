package com.genealogy.operationlog.application;

import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.dto.RiskAuditEventResponse;
import com.genealogy.operationlog.dto.RiskAuditStatsResponse;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.OperationLogRepository;
import com.genealogy.operationlog.repository.query.OperationLogGroupCountRow;
import com.genealogy.operationlog.repository.query.OperationLogQueryCriteria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class OperationRiskAuditApplicationService {

    private static final Set<String> LEVELS = Set.of("low", "medium", "high", "critical");
    private static final Set<String> EVENT_TYPES = Set.of(
            "permission_change", "sensitive_access", "bulk_export",
            "formal_data_change", "review_anomaly", "access_denied"
    );
    private static final Set<String> DISPOSITIONS = Set.of("open", "reviewing", "resolved", "accepted");

    private final OperationLogRepository operationLogRepository;

    public OperationRiskAuditApplicationService(OperationLogRepository operationLogRepository) {
        this.operationLogRepository = operationLogRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<RiskAuditEventResponse> search(
            Long clanId,
            List<Long> actorIds,
            List<String> riskLevels,
            List<String> eventTypes,
            List<Long> branchIds,
            List<String> dispositionStatuses,
            LocalDateTime startTime,
            LocalDateTime endTime,
            int pageNo,
            int pageSize,
            boolean includeTechnicalFields,
            PermissionDataScope scope
    ) {
        int normalizedPageNo = Math.max(1, pageNo);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, 100));
        OperationLogQueryCriteria criteria = criteria(
                clanId,
                actorIds,
                riskLevels,
                eventTypes,
                branchIds,
                dispositionStatuses,
                startTime,
                endTime,
                scope
        );
        Page<OperationLogEntity> page = operationLogRepository.search(
                criteria,
                PageRequest.of(
                        normalizedPageNo - 1,
                        normalizedPageSize,
                        Sort.by(Sort.Direction.DESC, "createdAt")
                                .and(Sort.by(Sort.Direction.DESC, "id"))
                )
        );
        return PageResponse.of(
                page.map(entity -> toResponse(entity, includeTechnicalFields)).getContent(),
                page.getTotalElements(),
                normalizedPageNo,
                normalizedPageSize
        );
    }

    public PageResponse<RiskAuditEventResponse> search(
            Long clanId,
            Long actorId,
            String riskLevel,
            String eventType,
            Long branchId,
            String dispositionStatus,
            LocalDateTime startTime,
            LocalDateTime endTime,
            int pageNo,
            int pageSize,
            boolean includeTechnicalFields,
            PermissionDataScope scope
    ) {
        return search(
                clanId,
                valueList(actorId),
                valueList(riskLevel),
                valueList(eventType),
                valueList(branchId),
                valueList(dispositionStatus),
                startTime,
                endTime,
                pageNo,
                pageSize,
                includeTechnicalFields,
                scope
        );
    }

    @Transactional(readOnly = true)
    public RiskAuditStatsResponse stats(
            Long clanId,
            List<Long> actorIds,
            List<String> riskLevels,
            List<String> eventTypes,
            List<Long> branchIds,
            List<String> dispositionStatuses,
            LocalDateTime startTime,
            LocalDateTime endTime,
            PermissionDataScope scope
    ) {
        OperationLogQueryCriteria criteria = criteria(
                clanId,
                actorIds,
                riskLevels,
                eventTypes,
                branchIds,
                dispositionStatuses,
                startTime,
                endTime,
                scope
        );
        return new RiskAuditStatsResponse(
                operationLogRepository.count(criteria),
                toStats(operationLogRepository.groupByRiskLevel(criteria)),
                toStats(operationLogRepository.groupByRiskEventType(criteria)),
                toStats(operationLogRepository.groupByDispositionStatus(criteria))
        );
    }

    public RiskAuditStatsResponse stats(
            Long clanId,
            Long actorId,
            String riskLevel,
            String eventType,
            Long branchId,
            String dispositionStatus,
            LocalDateTime startTime,
            LocalDateTime endTime,
            PermissionDataScope scope
    ) {
        return stats(
                clanId,
                valueList(actorId),
                valueList(riskLevel),
                valueList(eventType),
                valueList(branchId),
                valueList(dispositionStatus),
                startTime,
                endTime,
                scope
        );
    }

    private OperationLogQueryCriteria criteria(
            Long clanId,
            List<Long> actorIds,
            List<String> riskLevels,
            List<String> eventTypes,
            List<Long> branchIds,
            List<String> dispositionStatuses,
            LocalDateTime startTime,
            LocalDateTime endTime,
            PermissionDataScope scope
    ) {
        List<Long> normalizedActors = normalizeLongs(actorIds);
        List<String> normalizedLevels = List.copyOf(validatedValues(
                riskLevels,
                LEVELS,
                "OPERATION_RISK_LEVEL_INVALID",
                "风险等级不正确"
        ));
        List<String> normalizedEventTypes = List.copyOf(validatedValues(
                eventTypes,
                EVENT_TYPES,
                "OPERATION_RISK_EVENT_INVALID",
                "风险事件类型不正确"
        ));
        List<String> normalizedDispositions = List.copyOf(validatedValues(
                dispositionStatuses,
                DISPOSITIONS,
                "OPERATION_RISK_DISPOSITION_INVALID",
                "风险处置状态不正确"
        ));
        Set<Long> requestedBranchIds = new LinkedHashSet<>(normalizeLongs(branchIds));
        PermissionDataScope effectiveScope = scope == null ? PermissionDataScope.none() : scope;
        for (Long branchId : requestedBranchIds) {
            if (!effectiveScope.canAccessBranch(branchId)) {
                throw new BusinessException("AUTH_FORBIDDEN", "当前账号无权查看该支派的风险事件");
            }
        }
        List<Long> constrainedBranchIds = requestedBranchIds.isEmpty()
                ? effectiveScope.visibleBranchIds().stream().sorted().toList()
                : List.copyOf(requestedBranchIds);
        boolean enforceBranchScope = !requestedBranchIds.isEmpty() || !effectiveScope.fullClanAccess();
        return new OperationLogQueryCriteria(
                clanId,
                normalizedActors,
                List.of(),
                List.of(),
                null,
                List.of(),
                startTime,
                endTime,
                null,
                List.of(),
                true,
                normalizedLevels,
                normalizedEventTypes,
                normalizedDispositions,
                enforceBranchScope,
                constrainedBranchIds
        );
    }

    private List<RiskAuditStatsResponse.Item> toStats(List<OperationLogGroupCountRow> rows) {
        return rows.stream()
                .map(row -> new RiskAuditStatsResponse.Item(row.key(), row.count()))
                .toList();
    }

    private RiskAuditEventResponse toResponse(OperationLogEntity entity, boolean includeTechnicalFields) {
        String trackingTargetType = entity.getBusinessTargetType() == null
                ? entity.getTargetType()
                : entity.getBusinessTargetType();
        Long trackingTargetId = entity.getBusinessTargetId() == null
                ? entity.getTargetId()
                : entity.getBusinessTargetId();
        return new RiskAuditEventResponse(
                entity.getId(), entity.getClanId(), entity.getActorId(), null,
                entity.getActionType(), entity.getRiskLevel(), entity.getRiskEventType(),
                entity.getDispositionStatus(), entity.getBranchId(), entity.getTargetType(),
                entity.getTargetId(), null, null, null, entity.getEventResult(),
                entity.getSummary(), includeTechnicalFields ? entity.getDetail() : null,
                includeTechnicalFields ? entity.getRequestId() : null,
                includeTechnicalFields ? entity.getClientIp() : null, entity.getCreatedAt(),
                entity.getTraceId(), entity.getRevisionId(), entity.getReviewTaskId(),
                trackingTargetType, trackingTargetId, includeTechnicalFields
        );
    }

    private List<Long> normalizeLongs(List<Long> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream().filter(java.util.Objects::nonNull).distinct().toList();
    }

    private Set<String> validatedValues(
            List<String> values,
            Set<String> allowed,
            String code,
            String message
    ) {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        if (values == null) {
            return normalized;
        }
        values.stream()
                .filter(java.util.Objects::nonNull)
                .flatMap(value -> java.util.Arrays.stream(value.split(",")))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(value -> value.toLowerCase(Locale.ROOT))
                .forEach(value -> {
                    if (!allowed.contains(value)) {
                        throw new BusinessException(code, message);
                    }
                    normalized.add(value);
                });
        return normalized;
    }

    private <T> List<T> valueList(T value) {
        return value == null ? List.of() : List.of(value);
    }
}
