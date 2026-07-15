package com.genealogy.culture.application;

import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CulturePermissionPolicyService;
import com.genealogy.culture.domain.CultureSitePermissionPolicyService;
import com.genealogy.culture.domain.MigrationEventPermissionPolicyService;
import com.genealogy.culture.repository.CultureSiteTrackingQueryRepository;
import com.genealogy.culture.repository.CultureTrackingQueryRepository;
import com.genealogy.culture.repository.MigrationTrackingQueryRepository;
import com.genealogy.tracking.application.TrackingObjectSearchApplicationService;
import com.genealogy.tracking.dto.TrackingObjectResponse;
import com.genealogy.tracking.repository.TrackingObjectQueryRepository;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Primary
@Service
public class CultureAwareTrackingObjectSearchApplicationService extends TrackingObjectSearchApplicationService {

    private final RbacAuthorizationApplicationService governedRbac;
    private final CultureTrackingQueryRepository cultureTrackingQueryRepository;
    private final MigrationTrackingQueryRepository migrationTrackingQueryRepository;
    private final CultureSiteTrackingQueryRepository cultureSiteTrackingQueryRepository;

    public CultureAwareTrackingObjectSearchApplicationService(
            TrackingObjectQueryRepository queryRepository,
            RbacAuthorizationApplicationService rbacAuthorizationApplicationService,
            CultureTrackingQueryRepository cultureTrackingQueryRepository,
            MigrationTrackingQueryRepository migrationTrackingQueryRepository,
            CultureSiteTrackingQueryRepository cultureSiteTrackingQueryRepository
    ) {
        super(queryRepository, rbacAuthorizationApplicationService);
        this.governedRbac = rbacAuthorizationApplicationService;
        this.cultureTrackingQueryRepository = cultureTrackingQueryRepository;
        this.migrationTrackingQueryRepository = migrationTrackingQueryRepository;
        this.cultureSiteTrackingQueryRepository = cultureSiteTrackingQueryRepository;
    }

    @Override
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
        String normalizedType = normalize(objectType);
        if (!"culture_item".equals(normalizedType)
                && !"migration_event".equals(normalizedType)
                && !"culture_site".equals(normalizedType)) {
            return super.search(
                    clanId, actorId, objectType, keyword, branchId, status,
                    changedFrom, changedTo, pageNo, pageSize
            );
        }
        String normalizedKeyword = normalizeOptional(keyword, 100, "TRACKING_KEYWORD_TOO_LONG", "搜索关键词不能超过100个字符");
        String normalizedStatus = normalizeOptional(status, 50, "TRACKING_STATUS_TOO_LONG", "状态筛选不能超过50个字符");
        if (changedFrom != null && changedTo != null && changedFrom.isAfter(changedTo)) {
            throw new BusinessException("TRACKING_TIME_RANGE_INVALID", "最近变更开始时间不能晚于结束时间");
        }
        int normalizedPageNo = Math.max(1, pageNo);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, 50));
        PermissionDataScope scope = governedRbac.permissionDataScope(
                actorId, clanId, TrackingObjectSearchApplicationService.PERMISSION_VIEW
        );
        if (!scope.fullClanAccess() && scope.visibleBranchIds().isEmpty()) {
            return PageResponse.of(List.of(), 0L, normalizedPageNo, normalizedPageSize);
        }
        if (branchId != null && !scope.canAccessBranch(branchId)) {
            return PageResponse.of(List.of(), 0L, normalizedPageNo, normalizedPageSize);
        }
        String sensitivePermission = switch (normalizedType) {
            case "migration_event" -> MigrationEventPermissionPolicyService.VIEW_SENSITIVE;
            case "culture_site" -> CultureSitePermissionPolicyService.VIEW_SENSITIVE;
            default -> CulturePermissionPolicyService.VIEW_SENSITIVE;
        };
        boolean sensitiveAccess = governedRbac.hasPermission(actorId, clanId, sensitivePermission);
        if ("migration_event".equals(normalizedType)) {
            return migrationTrackingQueryRepository.search(
                    clanId, normalizedKeyword, branchId, normalizedStatus, changedFrom, changedTo,
                    scope.fullClanAccess(), scope.queryVisibleBranchIds(), sensitiveAccess,
                    normalizedPageNo, normalizedPageSize
            );
        }
        if ("culture_site".equals(normalizedType)) {
            return cultureSiteTrackingQueryRepository.search(
                    clanId, normalizedKeyword, branchId, normalizedStatus, changedFrom, changedTo,
                    scope.fullClanAccess(), scope.queryVisibleBranchIds(), sensitiveAccess,
                    normalizedPageNo, normalizedPageSize
            );
        }
        return cultureTrackingQueryRepository.search(
                clanId, normalizedKeyword, branchId, normalizedStatus, changedFrom, changedTo,
                scope.fullClanAccess(), scope.queryVisibleBranchIds(), sensitiveAccess,
                normalizedPageNo, normalizedPageSize
        );
    }

    private String normalize(String value) {
        if (value == null) return "";
        String normalized = value.trim().toLowerCase();
        return switch (normalized) {
            case "culture_items" -> "culture_item";
            case "migration_events" -> "migration_event";
            case "culture_sites" -> "culture_site";
            default -> normalized;
        };
    }

    private String normalizeOptional(String value, int maxLength, String errorCode, String message) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.trim();
        if (normalized.length() > maxLength) throw new BusinessException(errorCode, message);
        return normalized;
    }
}
