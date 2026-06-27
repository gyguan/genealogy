package com.genealogy.operationlog.application;

import com.genealogy.common.api.PageResponse;
import com.genealogy.operationlog.dto.OperationLogResponse;
import com.genealogy.operationlog.dto.OperationLogStatsResponse;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.OperationLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class OperationLogApplicationService {

    private static final int EXPORT_LIMIT = 10000;

    private final OperationLogRepository operationLogRepository;

    public OperationLogApplicationService(OperationLogRepository operationLogRepository) {
        this.operationLogRepository = operationLogRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long clanId, Long actorId, String actionType, String targetType, Long targetId, String summary, String detail) {
        record(clanId, actorId, actionType, targetType, targetId, summary, detail, null, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long clanId, Long actorId, String actionType, String targetType, Long targetId, String summary, String detail, String requestId, String clientIp) {
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
            entity.setCreatedAt(LocalDateTime.now());
            operationLogRepository.save(entity);
        } catch (Exception ignored) {
            // 审计日志失败不能阻塞主业务链路。
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<OperationLogResponse> list(Long clanId, String targetType, Long targetId, int pageNo, int pageSize) {
        return search(clanId, null, null, targetType, targetId, null, null, null, pageNo, pageSize);
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
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<OperationLogEntity> page = operationLogRepository.findAll(buildSpecification(
                clanId, actorId, normalize(actionType), normalize(targetType), targetId, startTime, endTime, trimToNull(keyword)
        ), pageRequest);
        return PageResponse.of(page.map(this::toResponse).getContent(), page.getTotalElements(), pageNo, pageSize);
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
        List<OperationLogEntity> logs = loadForExport(clanId, actorId, actionType, targetType, targetId, startTime, endTime, keyword);
        StringBuilder builder = new StringBuilder();
        appendCsvRow(builder, List.of("id", "clanId", "actorId", "actionType", "targetType", "targetId", "summary", "detail", "requestId", "clientIp", "createdAt"));
        for (OperationLogEntity log : logs) {
            appendCsvRow(builder, List.of(
                    value(log.getId()), value(log.getClanId()), value(log.getActorId()), value(log.getActionType()),
                    value(log.getTargetType()), value(log.getTargetId()), value(log.getSummary()), value(log.getDetail()),
                    value(log.getRequestId()), value(log.getClientIp()), value(log.getCreatedAt())
            ));
        }
        return ("\uFEFF" + builder).getBytes(StandardCharsets.UTF_8);
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
        List<OperationLogEntity> logs = loadForExport(clanId, actorId, actionType, targetType, targetId, startTime, endTime, keyword);
        return new OperationLogStatsResponse(
                logs.size(),
                group(logs.stream().map(OperationLogEntity::getActionType).collect(Collectors.toList())),
                group(logs.stream().map(log -> value(log.getActorId())).collect(Collectors.toList()))
        );
    }

    private List<OperationLogEntity> loadForExport(Long clanId, Long actorId, String actionType, String targetType, Long targetId, LocalDateTime startTime, LocalDateTime endTime, String keyword) {
        PageRequest pageRequest = PageRequest.of(0, EXPORT_LIMIT, Sort.by(Sort.Direction.DESC, "createdAt"));
        return operationLogRepository.findAll(buildSpecification(
                clanId, actorId, normalize(actionType), normalize(targetType), targetId, startTime, endTime, trimToNull(keyword)
        ), pageRequest).getContent();
    }

    private List<OperationLogStatsResponse.Item> group(List<String> values) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String value : values) {
            String key = value == null || value.isBlank() ? "unknown" : value;
            counts.put(key, counts.getOrDefault(key, 0L) + 1);
        }
        return counts.entrySet().stream()
                .map(entry -> new OperationLogStatsResponse.Item(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparingLong(OperationLogStatsResponse.Item::count).reversed())
                .toList();
    }

    private Specification<OperationLogEntity> buildSpecification(Long clanId, Long actorId, String actionType, String targetType, Long targetId, LocalDateTime startTime, LocalDateTime endTime, String keyword) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (clanId != null) {
                predicates.add(criteriaBuilder.equal(root.get("clanId"), clanId));
            }
            if (actorId != null) {
                predicates.add(criteriaBuilder.equal(root.get("actorId"), actorId));
            }
            if (actionType != null) {
                predicates.add(criteriaBuilder.equal(root.get("actionType"), actionType));
            }
            if (targetType != null) {
                predicates.add(criteriaBuilder.equal(root.get("targetType"), targetType));
            }
            if (targetId != null) {
                predicates.add(criteriaBuilder.equal(root.get("targetId"), targetId));
            }
            if (startTime != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), startTime));
            }
            if (endTime != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), endTime));
            }
            if (keyword != null) {
                String likeValue = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("summary")), likeValue),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("detail")), likeValue)
                ));
            }
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    private OperationLogResponse toResponse(OperationLogEntity entity) {
        return new OperationLogResponse(
                entity.getId(), entity.getClanId(), entity.getActorId(), entity.getActionType(), entity.getTargetType(),
                entity.getTargetId(), entity.getSummary(), entity.getDetail(), entity.getRequestId(), entity.getClientIp(), entity.getCreatedAt()
        );
    }

    private void appendCsvRow(StringBuilder builder, List<String> values) {
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) {
                builder.append(',');
            }
            builder.append(escapeCsv(values.get(i)));
        }
        builder.append('\n');
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        boolean shouldQuote = value.contains(",") || value.contains("\n") || value.contains("\r") || value.contains("\"");
        String escaped = value.replace("\"", "\"\"");
        return shouldQuote ? "\"" + escaped + "\"" : escaped;
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
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, maxLength);
    }
}
