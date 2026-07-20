package com.genealogy.tracking.application;

import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.tracking.dto.TrackingObjectResponse;
import com.genealogy.tracking.repository.TrackingObjectQueryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class TrackingObjectSearchApplicationService {

    public static final String PERMISSION_VIEW = "operation_log.view";
    private static final Set<String> OBJECT_TYPES = Set.of(
            "person", "relationship", "source", "branch", "review_task"
    );

    private final TrackingObjectQueryRepository queryRepository;
    private final RbacAuthorizationApplicationService rbacAuthorizationApplicationService;

    public TrackingObjectSearchApplicationService(
            TrackingObjectQueryRepository queryRepository,
            RbacAuthorizationApplicationService rbacAuthorizationApplicationService
    ) {
        this.queryRepository = queryRepository;
        this.rbacAuthorizationApplicationService = rbacAuthorizationApplicationService;
    }

    @Transactional(readOnly = true)
    public PageResponse<TrackingObjectResponse> search(
            Long clanId,
            Long actorId,
            List<String> objectTypes,
            String keyword,
            Long branchId,
            List<String> statuses,
            LocalDateTime changedFrom,
            LocalDateTime changedTo,
            int pageNo,
            int pageSize
    ) {
        List<String> normalizedObjectTypes = normalizeObjectTypes(objectTypes);
        String normalizedKeyword = normalizeOptional(keyword, 100, "TRACKING_KEYWORD_TOO_LONG", "搜索关键词不能超过100个字符");
        List<String> normalizedStatuses = normalizeOptionalValues(statuses, 50, "TRACKING_STATUS_TOO_LONG", "状态筛选不能超过50个字符");
        if (changedFrom != null && changedTo != null && changedFrom.isAfter(changedTo)) {
            throw new BusinessException("TRACKING_TIME_RANGE_INVALID", "最近变更开始时间不能晚于结束时间");
        }
        int normalizedPageNo = Math.max(1, pageNo);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, 50));
        PermissionDataScope dataScope = rbacAuthorizationApplicationService.permissionDataScope(
                actorId,
                clanId,
                PERMISSION_VIEW
        );
        if (!dataScope.fullClanAccess() && dataScope.visibleBranchIds().isEmpty()) {
            return PageResponse.of(List.of(), 0L, normalizedPageNo, normalizedPageSize);
        }
        if (branchId != null && !dataScope.canAccessBranch(branchId)) {
            return PageResponse.of(List.of(), 0L, normalizedPageNo, normalizedPageSize);
        }

        long requested = (long) normalizedPageNo * normalizedPageSize;
        int requiredRecords = (int) Math.min(requested, 10_000L);
        List<TrackingObjectResponse> merged = new ArrayList<>();
        long total = 0L;
        for (String objectType : normalizedObjectTypes) {
            if (normalizedStatuses.isEmpty()) {
                PageResponse<TrackingObjectResponse> page = searchSingle(
                        clanId, objectType, normalizedKeyword, branchId, null, changedFrom, changedTo,
                        dataScope, requiredRecords
                );
                merged.addAll(page.records());
                total += page.total();
            } else {
                for (String status : normalizedStatuses) {
                    PageResponse<TrackingObjectResponse> page = searchSingle(
                            clanId, objectType, normalizedKeyword, branchId, status, changedFrom, changedTo,
                            dataScope, requiredRecords
                    );
                    merged.addAll(page.records());
                    total += page.total();
                }
            }
        }

        List<TrackingObjectResponse> ordered = merged.stream()
                .collect(java.util.stream.Collectors.toMap(
                        item -> item.objectType() + ":" + item.objectId(),
                        item -> item,
                        (left, right) -> left,
                        java.util.LinkedHashMap::new
                ))
                .values().stream()
                .sorted(Comparator.comparing(
                        TrackingObjectResponse::changedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ).thenComparing(TrackingObjectResponse::objectId, Comparator.reverseOrder()))
                .toList();
        int fromIndex = Math.min((normalizedPageNo - 1) * normalizedPageSize, ordered.size());
        int toIndex = Math.min(fromIndex + normalizedPageSize, ordered.size());
        return PageResponse.of(ordered.subList(fromIndex, toIndex), total, normalizedPageNo, normalizedPageSize);
    }

    public PageResponse<TrackingObjectResponse> search(
            Long clanId,
            Long actorId,
            String objectType,
            String keyword,
            Long branchId,
            String status,
            LocalDateTime changedFrom,
            LocalDateTime changedTo,
            int pageNo,
            int pageSize
    ) {
        return search(
                clanId,
                actorId,
                objectType == null ? List.of() : List.of(objectType),
                keyword,
                branchId,
                status == null ? List.of() : List.of(status),
                changedFrom,
                changedTo,
                pageNo,
                pageSize
        );
    }

    private PageResponse<TrackingObjectResponse> searchSingle(
            Long clanId,
            String objectType,
            String keyword,
            Long branchId,
            String status,
            LocalDateTime changedFrom,
            LocalDateTime changedTo,
            PermissionDataScope dataScope,
            int requiredRecords
    ) {
        return queryRepository.search(
                clanId,
                objectType,
                keyword,
                branchId,
                status,
                changedFrom,
                changedTo,
                dataScope.fullClanAccess(),
                dataScope.queryVisibleBranchIds(),
                1,
                requiredRecords
        );
    }

    private List<String> normalizeObjectTypes(List<String> objectTypes) {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        if (objectTypes != null) {
            objectTypes.stream()
                    .filter(java.util.Objects::nonNull)
                    .flatMap(value -> java.util.Arrays.stream(value.split(",")))
                    .map(this::normalizeObjectType)
                    .forEach(normalized::add);
        }
        if (normalized.isEmpty()) {
            throw new BusinessException("TRACKING_OBJECT_TYPE_REQUIRED", "请选择业务对象类型");
        }
        return List.copyOf(normalized);
    }

    private String normalizeObjectType(String objectType) {
        if (objectType == null || objectType.isBlank()) {
            throw new BusinessException("TRACKING_OBJECT_TYPE_REQUIRED", "请选择业务对象类型");
        }
        String normalized = objectType.trim().toLowerCase(Locale.ROOT);
        normalized = switch (normalized) {
            case "persons" -> "person";
            case "relationships" -> "relationship";
            case "sources" -> "source";
            case "branches" -> "branch";
            case "review_tasks" -> "review_task";
            default -> normalized;
        };
        if (!OBJECT_TYPES.contains(normalized)) {
            throw new BusinessException("TRACKING_OBJECT_TYPE_INVALID", "不支持的业务对象类型");
        }
        return normalized;
    }

    private List<String> normalizeOptionalValues(
            List<String> values,
            int maxLength,
            String errorCode,
            String message
    ) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        values.stream()
                .filter(java.util.Objects::nonNull)
                .flatMap(value -> java.util.Arrays.stream(value.split(",")))
                .map(value -> normalizeOptional(value, maxLength, errorCode, message))
                .filter(java.util.Objects::nonNull)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .forEach(normalized::add);
        return List.copyOf(normalized);
    }

    private String normalizeOptional(String value, int maxLength, String errorCode, String message) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw new BusinessException(errorCode, message);
        }
        return normalized;
    }
}
