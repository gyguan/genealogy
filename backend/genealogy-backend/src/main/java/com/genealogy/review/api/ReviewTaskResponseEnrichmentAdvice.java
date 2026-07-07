package com.genealogy.review.api;

import com.genealogy.common.api.ApiResponse;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@ControllerAdvice
public class ReviewTaskResponseEnrichmentAdvice implements ResponseBodyAdvice<Object> {

    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_PENDING_REVIEW = "pending_review";

    private final AuditRecordRepository auditRecordRepository;

    public ReviewTaskResponseEnrichmentAdvice(AuditRecordRepository auditRecordRepository) {
        this.auditRecordRepository = auditRecordRepository;
    }

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(
            Object body,
            MethodParameter returnType,
            MediaType selectedContentType,
            Class<? extends HttpMessageConverter<?>> selectedConverterType,
            ServerHttpRequest request,
            ServerHttpResponse response
    ) {
        if (!(body instanceof ApiResponse<?> apiResponse) || !apiResponse.isSuccess()) {
            return body;
        }
        Object data = apiResponse.getData();
        Object enrichedData = enrich(data);
        if (enrichedData == data) {
            return body;
        }
        return new ApiResponse<>(apiResponse.isSuccess(), apiResponse.getCode(), apiResponse.getMessage(), enrichedData, apiResponse.getTimestamp());
    }

    private Object enrich(Object data) {
        if (data instanceof CheckTaskResponse task) {
            return taskMap(task, recordMap(Set.of(task.revisionId())));
        }
        if (data instanceof List<?> list && list.stream().anyMatch(CheckTaskResponse.class::isInstance)) {
            List<CheckTaskResponse> tasks = list.stream()
                    .filter(CheckTaskResponse.class::isInstance)
                    .map(CheckTaskResponse.class::cast)
                    .toList();
            Set<Long> revisionIds = tasks.stream()
                    .map(CheckTaskResponse::revisionId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            Map<Long, AuditRecordEntity> records = recordMap(revisionIds);
            return tasks.stream().map(task -> taskMap(task, records)).toList();
        }
        return data;
    }

    private Map<Long, AuditRecordEntity> recordMap(Set<Long> revisionIds) {
        Set<Long> cleanIds = revisionIds.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        if (cleanIds.isEmpty()) {
            return Map.of();
        }
        return auditRecordRepository.findAllById(cleanIds).stream()
                .collect(Collectors.toMap(AuditRecordEntity::getId, Function.identity(), (left, right) -> left));
    }

    private Map<String, Object> taskMap(CheckTaskResponse task, Map<Long, AuditRecordEntity> records) {
        AuditRecordEntity record = Optional.ofNullable(task.revisionId()).map(records::get).orElse(null);
        String targetType = record == null ? null : record.getTargetType();
        Long targetId = record == null ? null : record.getTargetId();
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", task.id());
        map.put("clanId", task.clanId());
        map.put("revisionId", task.revisionId());
        map.put("targetType", targetType);
        map.put("targetId", targetId);
        map.put("title", reviewTitle(targetType, targetId));
        map.put("reviewLevel", task.reviewLevel());
        map.put("reviewerId", task.reviewerId());
        map.put("reviewerRole", task.reviewerRole());
        map.put("branchId", task.branchId());
        map.put("status", externalStatus(task.status()));
        map.put("taskStatus", task.status());
        map.put("reviewStatus", externalStatus(task.status()));
        map.put("reviewComment", task.reviewComment());
        map.put("reviewedAt", task.reviewedAt());
        map.put("createdAt", task.createdAt());
        return map;
    }

    private String externalStatus(String status) {
        if (STATUS_PENDING.equalsIgnoreCase(String.valueOf(status))) {
            return STATUS_PENDING_REVIEW;
        }
        return status;
    }

    private String reviewTitle(String targetType, Long targetId) {
        String label = targetTypeLabel(targetType);
        if (targetId == null) {
            return label + "变更审核";
        }
        return label + "#" + targetId + " 变更审核";
    }

    private String targetTypeLabel(String targetType) {
        String normalized = String.valueOf(targetType == null ? "" : targetType).trim().toLowerCase().replace("-", "_");
        return switch (normalized) {
            case "person", "persons" -> "人物";
            case "relationship", "relationships" -> "关系";
            case "source", "sources" -> "来源";
            case "branch", "branches" -> "支派";
            case "generation_scheme", "generation_schemes" -> "字辈方案";
            case "clan" -> "宗族";
            default -> "入谱对象";
        };
    }
}
