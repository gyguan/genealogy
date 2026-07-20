package com.genealogy.operationlog.application;

import com.genealogy.common.api.PageResponse;
import com.genealogy.operationlog.dto.OperationLogResponse;
import com.genealogy.operationlog.dto.OperationLogStatsResponse;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.OperationLogRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
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
        PageRequest pageRequest = PageRequest.of(
                normalizedPageNo - 1,
                normalizedPageSize,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))
        );
        Page<OperationLogEntity> page = operationLogRepository.findAll(
                specification(clanId, actorIds, actionTypes, targetTypes, targetId, resultStatuses, startTime, endTime, keyword),
                pageRequest
        );
        return PageResponse.of(
                page.map(entity -> toResponse(entity, includeTechnicalFields)).getContent(),
                page.getTotalElements(),
                normalizedPageNo,
                normalizedPageSize
        );
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
        List<OperationLogEntity> logs = operationLogRepository.findAll(
                specification(clanId, actorIds, actionTypes, targetTypes, targetId, resultStatuses, startTime, endTime, keyword)
        );
        return new OperationLogStatsResponse(
                logs.size(),
                group(logs.stream().map(OperationLogEntity::getActionType).toList()),
                group(logs.stream().map(log -> log.getActorId() == null ? null : String.valueOf(log.getActorId())).toList())
        );
    }

    private Specification<OperationLogEntity> specification(
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
        List<Long> normalizedActors = normalizeLongs(actorIds);
        List<String> normalizedActions = normalizeStrings(actionTypes);
        List<String> normalizedTargets = normalizeStrings(targetTypes);
        List<String> normalizedResults = normalizeStrings(resultStatuses);
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim().toLowerCase(Locale.ROOT);
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("clanId"), clanId));
            if (!normalizedActors.isEmpty()) {
                predicates.add(root.get("actorId").in(normalizedActors));
            }
            if (!normalizedActions.isEmpty()) {
                predicates.add(root.get("actionType").in(normalizedActions));
            }
            if (!normalizedTargets.isEmpty()) {
                predicates.add(root.get("targetType").in(normalizedTargets));
            }
            if (targetId != null) {
                predicates.add(criteriaBuilder.equal(root.get("targetId"), targetId));
            }
            if (!normalizedResults.isEmpty()) {
                predicates.add(root.get("eventResult").in(normalizedResults));
            }
            if (startTime != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), startTime));
            }
            if (endTime != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), endTime));
            }
            if (normalizedKeyword != null) {
                String likeValue = "%" + normalizedKeyword + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("summary")), likeValue),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("detail")), likeValue)
                ));
            }
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    private List<Long> normalizeLongs(List<Long> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
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
        for (String value : values) {
            String key = value == null || value.isBlank() ? "unknown" : value;
            counts.put(key, counts.getOrDefault(key, 0L) + 1);
        }
        return counts.entrySet().stream()
                .map(entry -> new OperationLogStatsResponse.Item(entry.getKey(), entry.getValue()))
                .sorted(java.util.Comparator.comparingLong(OperationLogStatsResponse.Item::count).reversed())
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
}
