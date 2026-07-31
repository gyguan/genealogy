package com.genealogy.operationlog.application;

import com.genealogy.common.api.PageResponse;
import com.genealogy.operationlog.dto.OperationLogResponse;
import com.genealogy.operationlog.dto.OperationLogStatsResponse;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.OperationLogRepository;
import com.genealogy.operationlog.repository.query.OperationLogQueryCriteria;
import com.genealogy.operationlog.repository.query.OperationLogTargetGroup;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class OperationLogApplicationService {

    private static final Logger log = LoggerFactory.getLogger(OperationLogApplicationService.class);

    public static final int EXPORT_LIMIT = 10000;

    private final OperationLogRepository operationLogRepository;

    public OperationLogApplicationService(OperationLogRepository operationLogRepository) {
        this.operationLogRepository = operationLogRepository;
    }

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
        record(clanId, actorId, actionType, targetType, targetId, summary, detail, null, null, null, null);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void record(
            Long clanId,
            Long actorId,
            String actionType,
            String targetType,
            Long targetId,
            String summary,
            String detail,
            OperationTraceContext traceContext
    ) {
        record(clanId, actorId, actionType, targetType, targetId, summary, detail, null, null, traceContext, null);
    }

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
        record(clanId, actorId, actionType, targetType, targetId, summary, detail, requestId, clientIp, null, null);
    }

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
            String clientIp,
            OperationTraceContext traceContext
    ) {
        record(
                clanId,
                actorId,
                actionType,
                targetType,
                targetId,
                summary,
                detail,
                requestId,
                clientIp,
                traceContext,
                null
        );
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void recordRisk(
            Long clanId,
            Long actorId,
            String actionType,
            String targetType,
            Long targetId,
            String summary,
            String detail,
            OperationRiskContext riskContext
    ) {
        record(clanId, actorId, actionType, targetType, targetId, summary, detail, null, null, null, riskContext);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void recordRisk(
            Long clanId,
            Long actorId,
            String actionType,
            String targetType,
            Long targetId,
            String summary,
            String detail,
            String requestId,
            String clientIp,
            OperationRiskContext riskContext
    ) {
        record(
                clanId,
                actorId,
                actionType,
                targetType,
                targetId,
                summary,
                detail,
                requestId,
                clientIp,
                null,
                riskContext
        );
    }

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
            String clientIp,
            OperationTraceContext traceContext,
            OperationRiskContext riskContext
    ) {
        try {
            OperationLogEntity entity = new OperationLogEntity();
            entity.setClanId(clanId);
            entity.setActorId(actorId);
            entity.setActionType(normalize(actionType));
            entity.setTargetType(normalize(targetType));
            entity.setTargetId(targetId);
            entity.setSummary(trim(summary, 500));
            entity.setDetail(detail);
            entity.setRequestId(trim(requestId, 128));
            entity.setClientIp(trim(clientIp, 64));
            applyTrace(entity, traceContext);
            applyRisk(entity, OperationRiskPolicy.resolve(actionType, riskContext));
            entity.setCreatedAt(LocalDateTime.now());
            operationLogRepository.save(entity);
        } catch (Exception exception) {
            log.warn(
                    "operation_log_record_failed clanId={} actorId={} actionType={} "
                            + "targetType={} targetId={} requestId={}",
                    clanId,
                    actorId,
                    normalize(actionType),
                    normalize(targetType),
                    targetId,
                    trim(requestId, 128),
                    exception
            );
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<OperationLogResponse> list(
            Long clanId,
            String targetType,
            Long targetId,
            int pageNo,
            int pageSize
    ) {
        return search(clanId, null, null, targetType, targetId, null, null, null, pageNo, pageSize, false);
    }

    @Transactional(readOnly = true)
    public PageResponse<OperationLogResponse> searchByTargets(
            Long clanId,
            Map<String, ? extends Collection<Long>> targetIdsByType,
            int limit,
            boolean includeTechnicalFields
    ) {
        List<OperationLogTargetGroup> targetGroups = normalizeTargetGroups(targetIdsByType);
        int normalizedLimit = Math.max(1, Math.min(limit, 500));
        if (clanId == null || targetGroups.isEmpty()) {
            return PageResponse.of(List.of(), 0L, 1, normalizedLimit);
        }
        Page<OperationLogEntity> page = operationLogRepository.search(
                criteria(clanId, List.of(), List.of(), List.of(), null, List.of(), null, null, null, targetGroups),
                pageRequest(1, normalizedLimit)
        );
        return PageResponse.of(
                page.map(entity -> toResponse(entity, includeTechnicalFields)).getContent(),
                page.getTotalElements(),
                1,
                normalizedLimit
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<OperationLogResponse> search(
            Long clanId,
            Long actorId,
            String actionType,
            String targetType,
            Long targetId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String keyword,
            int pageNo,
            int pageSize
    ) {
        return search(
                clanId,
                actorId,
                actionType,
                targetType,
                targetId,
                startTime,
                endTime,
                keyword,
                pageNo,
                pageSize,
                false
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<OperationLogResponse> search(
            Long clanId,
            Long actorId,
            String actionType,
            String targetType,
            Long targetId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String keyword,
            int pageNo,
            int pageSize,
            boolean includeTechnicalFields
    ) {
        int normalizedPageNo = Math.max(1, pageNo);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, 100));
        OperationLogQueryCriteria criteria = criteria(
                clanId,
                actorId == null ? List.of() : List.of(actorId),
                valueList(normalize(actionType)),
                valueList(normalize(targetType)),
                targetId,
                List.of(),
                startTime,
                endTime,
                trimToNull(keyword),
                List.of()
        );
        Page<OperationLogEntity> page = operationLogRepository.search(
                criteria,
                pageRequest(normalizedPageNo, normalizedPageSize)
        );
        return PageResponse.of(
                page.map(entity -> toResponse(entity, includeTechnicalFields)).getContent(),
                page.getTotalElements(),
                normalizedPageNo,
                normalizedPageSize
        );
    }

    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long clanId,
            Long actorId,
            String actionType,
            String targetType,
            Long targetId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String keyword
    ) {
        List<OperationLogEntity> logs = loadForExport(
                clanId,
                actorId,
                actionType,
                targetType,
                targetId,
                startTime,
                endTime,
                keyword
        );
        return toCsv(logs);
    }

    @Transactional(readOnly = true)
    public OperationLogStatsResponse stats(
            Long clanId,
            Long actorId,
            String actionType,
            String targetType,
            Long targetId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String keyword
    ) {
        List<OperationLogEntity> logs = loadForExport(
                clanId,
                actorId,
                actionType,
                targetType,
                targetId,
                startTime,
                endTime,
                keyword
        );
        return new OperationLogStatsResponse(
                logs.size(),
                group(logs.stream().map(OperationLogEntity::getActionType).collect(Collectors.toList())),
                group(logs.stream().map(log -> value(log.getActorId())).collect(Collectors.toList()))
        );
    }

    private void applyTrace(OperationLogEntity entity, OperationTraceContext context) {
        if (context == null) {
            return;
        }
        entity.setTraceId(context.traceId());
        entity.setRevisionId(context.revisionId());
        entity.setReviewTaskId(context.reviewTaskId());
        entity.setBusinessTargetType(normalize(context.businessTargetType()));
        entity.setBusinessTargetId(context.businessTargetId());
        entity.setEventResult(normalize(context.eventResult()));
    }

    private void applyRisk(OperationLogEntity entity, OperationRiskContext context) {
        if (context == null) {
            return;
        }
        entity.setRiskLevel(context.riskLevel());
        entity.setRiskEventType(context.eventType());
        entity.setDispositionStatus(context.dispositionStatus());
        entity.setBranchId(context.branchId());
    }

    private List<OperationLogEntity> loadForExport(
            Long clanId,
            Long actorId,
            String actionType,
            String targetType,
            Long targetId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String keyword
    ) {
        OperationLogQueryCriteria criteria = criteria(
                clanId,
                actorId == null ? List.of() : List.of(actorId),
                valueList(normalize(actionType)),
                valueList(normalize(targetType)),
                targetId,
                List.of(),
                startTime,
                endTime,
                trimToNull(keyword),
                List.of()
        );
        return operationLogRepository.list(criteria, EXPORT_LIMIT);
    }

    private OperationLogQueryCriteria criteria(
            Long clanId,
            List<Long> actorIds,
            List<String> actionTypes,
            List<String> targetTypes,
            Long targetId,
            List<String> resultStatuses,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String keyword,
            List<OperationLogTargetGroup> targetGroups
    ) {
        return new OperationLogQueryCriteria(
                clanId,
                actorIds,
                actionTypes,
                targetTypes,
                targetId,
                resultStatuses,
                startTime,
                endTime,
                keyword,
                targetGroups,
                false,
                List.of(),
                List.of(),
                List.of(),
                false,
                List.of()
        );
    }

    private List<OperationLogTargetGroup> normalizeTargetGroups(
            Map<String, ? extends Collection<Long>> targetIdsByType
    ) {
        if (targetIdsByType == null) {
            return List.of();
        }
        Map<String, List<Long>> normalized = new LinkedHashMap<>();
        targetIdsByType.forEach((type, ids) -> {
            String normalizedType = normalize(type);
            if (normalizedType == null || ids == null) {
                return;
            }
            List<Long> normalizedIds = ids.stream()
                    .filter(java.util.Objects::nonNull)
                    .distinct()
                    .toList();
            if (!normalizedIds.isEmpty()) {
                normalized.put(normalizedType, normalizedIds);
            }
        });
        return normalized.entrySet().stream()
                .map(entry -> new OperationLogTargetGroup(entry.getKey(), entry.getValue()))
                .toList();
    }

    private PageRequest pageRequest(int pageNo, int pageSize) {
        return PageRequest.of(
                Math.max(0, pageNo - 1),
                pageSize,
                Sort.by(Sort.Direction.DESC, "createdAt")
                        .and(Sort.by(Sort.Direction.DESC, "id"))
        );
    }

    private List<OperationLogStatsResponse.Item> group(List<String> values) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String item : values) {
            String key = item == null || item.isBlank() ? "unknown" : item;
            counts.put(key, counts.getOrDefault(key, 0L) + 1);
        }
        return counts.entrySet().stream()
                .map(entry -> new OperationLogStatsResponse.Item(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparingLong(OperationLogStatsResponse.Item::count).reversed())
                .toList();
    }

    private OperationLogResponse toResponse(OperationLogEntity entity, boolean includeTechnicalFields) {
        return new OperationLogResponse(
                entity.getId(),
                entity.getClanId(),
                entity.getActorId(),
                null,
                entity.getActionType(),
                entity.getTargetType(),
                entity.getTargetId(),
                null,
                null,
                null,
                null,
                entity.getSummary(),
                includeTechnicalFields ? entity.getDetail() : null,
                includeTechnicalFields ? entity.getRequestId() : null,
                includeTechnicalFields ? entity.getClientIp() : null,
                entity.getCreatedAt(),
                entity.getTraceId(),
                entity.getRevisionId(),
                entity.getReviewTaskId(),
                entity.getBusinessTargetType(),
                entity.getBusinessTargetId(),
                entity.getEventResult()
        );
    }

    private byte[] toCsv(List<OperationLogEntity> logs) {
        StringBuilder builder = new StringBuilder();
        appendCsvRow(builder, List.of(
                "id", "clanId", "actorId", "actionType", "targetType", "targetId", "traceId", "revisionId",
                "reviewTaskId", "businessTargetType", "businessTargetId", "eventResult", "riskLevel", "riskEventType",
                "dispositionStatus", "branchId", "summary", "detail", "requestId", "clientIp", "createdAt"
        ));
        for (OperationLogEntity item : logs) {
            appendCsvRow(builder, List.of(
                    value(item.getId()), value(item.getClanId()), value(item.getActorId()), value(item.getActionType()),
                    value(item.getTargetType()), value(item.getTargetId()), value(item.getTraceId()),
                    value(item.getRevisionId()), value(item.getReviewTaskId()), value(item.getBusinessTargetType()),
                    value(item.getBusinessTargetId()), value(item.getEventResult()), value(item.getRiskLevel()),
                    value(item.getRiskEventType()), value(item.getDispositionStatus()), value(item.getBranchId()),
                    value(item.getSummary()), value(item.getDetail()), value(item.getRequestId()),
                    value(item.getClientIp()), value(item.getCreatedAt())
            ));
        }
        return ("\uFEFF" + builder).getBytes(StandardCharsets.UTF_8);
    }

    private void appendCsvRow(StringBuilder builder, List<String> values) {
        for (int index = 0; index < values.size(); index++) {
            if (index > 0) {
                builder.append(',');
            }
            builder.append(escapeCsv(values.get(index)));
        }
        builder.append('\n');
    }

    private String escapeCsv(String value) {
        String normalized = value == null ? "" : value;
        boolean quote = normalized.contains(",")
                || normalized.contains("\"")
                || normalized.contains("\n")
                || normalized.contains("\r");
        return quote ? "\"" + normalized.replace("\"", "\"\"") + "\"" : normalized;
    }

    private List<String> valueList(String value) {
        return value == null ? List.of() : List.of(value);
    }

    private String value(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String normalize(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String trim(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }
}
