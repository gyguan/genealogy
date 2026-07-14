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
            String objectType,
            String keyword,
            Long branchId,
            String status,
            LocalDateTime changedFrom,
            LocalDateTime changedTo,
            int pageNo,
            int pageSize
    ) {
        String normalizedObjectType = normalizeObjectType(objectType);
        String normalizedKeyword = normalizeOptional(keyword, 100, "TRACKING_KEYWORD_TOO_LONG", "搜索关键词不能超过100个字符");
        String normalizedStatus = normalizeOptional(status, 50, "TRACKING_STATUS_TOO_LONG", "状态筛选不能超过50个字符");
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
            return PageResponse.of(java.util.List.of(), 0L, normalizedPageNo, normalizedPageSize);
        }
        if (branchId != null && !dataScope.canAccessBranch(branchId)) {
            return PageResponse.of(java.util.List.of(), 0L, normalizedPageNo, normalizedPageSize);
        }
        return queryRepository.search(
                clanId,
                normalizedObjectType,
                normalizedKeyword,
                branchId,
                normalizedStatus,
                changedFrom,
                changedTo,
                dataScope.fullClanAccess(),
                dataScope.queryVisibleBranchIds(),
                normalizedPageNo,
                normalizedPageSize
        );
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
