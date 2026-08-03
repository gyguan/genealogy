package com.genealogy.operationlog.application;

import com.genealogy.common.api.PageResponse;
import com.genealogy.operationlog.dto.OperationLogResponse;
import com.genealogy.operationlog.dto.OperationLogStatsResponse;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.OperationLogRepository;
import com.genealogy.operationlog.repository.query.OperationLogQueryCriteria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class OperationLogMultiValueQueryService {

    private final OperationLogRepository operationLogRepository;

    public OperationLogMultiValueQueryService(OperationLogRepository operationLogRepository) {
        this.operationLogRepository = operationLogRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<OperationLogResponse> search(
            Long clanId,
            List<Long> actorIds,
            List<String> actionTypes,
            List<String> targetTypes,
            Long targetId,
            List<String> resultStatuses,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String keyword,
            int pageNo,
            int pageSize,
            boolean includeTechnicalFields
    ) {
        int normalizedPageNo = Math.max(1, pageNo);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, 100));
        Page<OperationLogEntity> page = operationLogRepository.search(
                criteria(
                        clanId,
                        actorIds,
                        actionTypes,
                        targetTypes,
                        targetId,
                        resultStatuses,
                        startTime,
                        endTime,
                        keyword
                ),
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

    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long clanId,
            List<Long> actorIds,
            List<String> actionTypes,
            List<String> targetTypes,
            Long targetId,
            List<String> resultStatuses,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String keyword
    ) {
        List<OperationLogEntity> logs = operationLogRepository.list(
                criteria(
                        clanId,
                        actorIds,
                        actionTypes,
                        targetTypes,
                        targetId,
                        resultStatuses,
                        startTime,
                        endTime,
                        keyword
                ),
                OperationLogApplicationService.EXPORT_LIMIT
        );
        return toCsv(logs);
    }

    @Transactional(readOnly = true)
    public OperationLogStatsResponse stats(
            Long clanId,
            List<Long> actorIds,
            List<String> actionTypes,
            List<String> targetTypes,
            Long targetId,
            List<String> resultStatuses,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String keyword
    ) {
        List<OperationLogEntity> logs = operationLogRepository.list(
                criteria(
                        clanId,
                        actorIds,
                        actionTypes,
                        targetTypes,
                        targetId,
                        resultStatuses,
                        startTime,
                        endTime,
                        keyword
                ),
                Integer.MAX_VALUE
        );
        return new OperationLogStatsResponse(
                logs.size(),
                group(logs.stream().map(OperationLogEntity::getActionType).toList()),
                group(logs.stream().map(log -> value(log.getActorId())).toList())
        );
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
            String keyword
    ) {
        return new OperationLogQueryCriteria(
                clanId,
                normalizeLongs(actorIds),
                normalizeStrings(actionTypes),
                normalizeStrings(targetTypes),
                targetId,
                normalizeStrings(resultStatuses),
                startTime,
                endTime,
                keyword == null || keyword.isBlank() ? null : keyword.trim(),
                List.of(),
                false,
                List.of(),
                List.of(),
                List.of(),
                false,
                List.of()
        );
    }

    private List<Long> normalizeLongs(List<Long> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream().filter(java.util.Objects::nonNull).distinct().toList();
    }

    private List<String> normalizeStrings(List<String> values) {
        if (values == null) {
            return List.of();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        values.stream()
                .filter(java.util.Objects::nonNull)
                .flatMap(value -> java.util.Arrays.stream(value.split(",")))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(value -> value.toLowerCase(Locale.ROOT))
                .forEach(normalized::add);
        return List.copyOf(normalized);
    }

    private List<OperationLogStatsResponse.Item> group(List<String> values) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String item : values) {
            String key = item == null || item.isBlank() ? "unknown" : item;
            counts.put(key, counts.getOrDefault(key, 0L) + 1);
        }
        return counts.entrySet().stream()
                .map(entry -> new OperationLogStatsResponse.Item(entry.getKey(), entry.getValue()))
                .sorted(java.util.Comparator.comparingLong(OperationLogStatsResponse.Item::count).reversed())
                .toList();
    }

    private OperationLogResponse toResponse(OperationLogEntity entity, boolean includeTechnicalFields) {
        return new OperationLogResponse(
                entity.getId(), entity.getClanId(), entity.getActorId(), null,
                entity.getActionType(), entity.getTargetType(), entity.getTargetId(),
                null, null, null, null, entity.getSummary(),
                includeTechnicalFields ? entity.getDetail() : null,
                includeTechnicalFields ? entity.getRequestId() : null,
                includeTechnicalFields ? entity.getClientIp() : null,
                entity.getCreatedAt(), entity.getTraceId(), entity.getRevisionId(),
                entity.getReviewTaskId(), entity.getBusinessTargetType(),
                entity.getBusinessTargetId(), entity.getEventResult()
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

    private String value(Object value) {
        return value == null ? "" : String.valueOf(value);
    }
}
