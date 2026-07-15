package com.genealogy.culture.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.dto.CultureQualityIssueResponse;
import com.genealogy.culture.dto.CultureQualityMetricResponse;
import com.genealogy.culture.dto.CultureQualityResponse;
import com.genealogy.culture.governance.CultureTargetGovernanceAdapter;
import com.genealogy.culture.governance.CultureTargetGovernanceRegistry;
import com.genealogy.culture.repository.CultureQualityQueryRepository;
import com.genealogy.culture.repository.CultureQualityQueryRepository.QualityIssue;
import com.genealogy.culture.repository.CultureQualityQueryRepository.QualityMetrics;
import com.genealogy.culture.repository.CultureQualityQueryRepository.QualityScope;
import com.genealogy.culture.repository.CultureQualityQueryRepository.TargetConfig;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class CultureQualityApplicationService {

    static final int STALE_DAYS = 365;
    static final int ISSUE_LIMIT_PER_TYPE = 10;
    static final int TOTAL_ISSUE_LIMIT = 30;

    private final AuthorizationApplicationService authorizationApplicationService;
    private final RbacAuthorizationApplicationService rbacAuthorizationApplicationService;
    private final CultureTargetGovernanceRegistry targetRegistry;
    private final CultureQualityQueryRepository qualityQueryRepository;

    public CultureQualityApplicationService(
            AuthorizationApplicationService authorizationApplicationService,
            RbacAuthorizationApplicationService rbacAuthorizationApplicationService,
            CultureTargetGovernanceRegistry targetRegistry,
            CultureQualityQueryRepository qualityQueryRepository
    ) {
        this.authorizationApplicationService = authorizationApplicationService;
        this.rbacAuthorizationApplicationService = rbacAuthorizationApplicationService;
        this.targetRegistry = targetRegistry;
        this.qualityQueryRepository = qualityQueryRepository;
    }

    @Transactional(readOnly = true)
    public CultureQualityResponse getQuality(Long clanId, Long actorId) {
        authorizationApplicationService.requireClanMember(clanId, actorId);
        LocalDateTime generatedAt = LocalDateTime.now();
        LocalDateTime staleBefore = generatedAt.minusDays(STALE_DAYS);
        boolean crossClanAdmin = authorizationApplicationService.isCrossClanAdmin(actorId);
        List<CultureQualityMetricResponse> metrics = new ArrayList<>();
        List<CultureQualityIssueResponse> issues = new ArrayList<>();
        boolean hasAnyScope = false;

        for (CultureTargetGovernanceAdapter adapter : targetRegistry.adapters()) {
            PermissionDataScope dataScope = crossClanAdmin
                    ? PermissionDataScope.full()
                    : rbacAuthorizationApplicationService.permissionDataScope(actorId, clanId, adapter.viewPermission());
            if (!dataScope.fullClanAccess() && dataScope.visibleBranchIds().isEmpty()) {
                continue;
            }
            hasAnyScope = true;
            boolean sensitiveAccess = crossClanAdmin || rbacAuthorizationApplicationService.hasPermission(
                    actorId, clanId, adapter.sensitiveViewPermission());
            QualityScope scope = new QualityScope(
                    clanId,
                    actorId,
                    dataScope.fullClanAccess(),
                    dataScope.queryVisibleBranchIds(),
                    sensitiveAccess,
                    staleBefore
            );
            TargetConfig config = TargetConfig.require(adapter.targetType());
            QualityMetrics values = qualityQueryRepository.metrics(config, scope);
            metrics.add(toMetric(config, values));
            qualityQueryRepository.issues(config, scope, ISSUE_LIMIT_PER_TYPE).stream()
                    .map(this::toIssue)
                    .forEach(issues::add);
        }

        if (!hasAnyScope) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限查看宗族文化质量数据");
        }

        metrics.sort(Comparator.comparing(CultureQualityMetricResponse::targetType));
        issues.sort(Comparator
                .comparing((CultureQualityIssueResponse issue) -> !issue.issueCodes().contains("PENDING_REVIEW"))
                .thenComparing(CultureQualityIssueResponse::updatedAt, Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(CultureQualityIssueResponse::targetType)
                .thenComparing(CultureQualityIssueResponse::targetId));
        List<CultureQualityIssueResponse> boundedIssues = issues.stream().limit(TOTAL_ISSUE_LIMIT).toList();
        CultureQualityMetricResponse overall = aggregate(metrics);
        List<String> notes = List.of(
                "统计仅包含当前用户可见范围，受限对象按最小披露规则过滤。",
                "待审核数量基于对象的 pending revision，包含正式对象更新、删除、归档和精选变更。",
                "长期未复核阈值为 " + STALE_DAYS + " 天；问题清单最多返回 " + TOTAL_ISSUE_LIMIT + " 条。"
        );
        return new CultureQualityResponse(clanId, generatedAt, overall, List.copyOf(metrics), boundedIssues, notes);
    }

    private CultureQualityMetricResponse toMetric(TargetConfig config, QualityMetrics values) {
        return new CultureQualityMetricResponse(
                config.targetType(),
                config.displayName(),
                values.officialCount(),
                values.pendingReviewCount(),
                values.sourceCoveredCount(),
                ratio(values.sourceCoveredCount(), values.officialCount()),
                values.strongSourceCount(),
                ratio(values.strongSourceCount(), values.officialCount()),
                values.completeCount(),
                ratio(values.completeCount(), values.officialCount()),
                values.lowConfidenceCount(),
                values.staleCount()
        );
    }

    private CultureQualityIssueResponse toIssue(QualityIssue issue) {
        return new CultureQualityIssueResponse(
                issue.targetType(),
                issue.targetId(),
                issue.displayName(),
                issue.branchId(),
                issue.branchName(),
                issue.issueCodes(),
                issue.updatedAt()
        );
    }

    private CultureQualityMetricResponse aggregate(List<CultureQualityMetricResponse> values) {
        long official = values.stream().mapToLong(CultureQualityMetricResponse::officialCount).sum();
        long pending = values.stream().mapToLong(CultureQualityMetricResponse::pendingReviewCount).sum();
        long sourced = values.stream().mapToLong(CultureQualityMetricResponse::sourceCoveredCount).sum();
        long strong = values.stream().mapToLong(CultureQualityMetricResponse::strongSourceCount).sum();
        long complete = values.stream().mapToLong(CultureQualityMetricResponse::completeCount).sum();
        long lowConfidence = values.stream().mapToLong(CultureQualityMetricResponse::lowConfidenceCount).sum();
        long stale = values.stream().mapToLong(CultureQualityMetricResponse::staleCount).sum();
        return new CultureQualityMetricResponse(
                "all",
                "全部宗族文化对象",
                official,
                pending,
                sourced,
                ratio(sourced, official),
                strong,
                ratio(strong, official),
                complete,
                ratio(complete, official),
                lowConfidence,
                stale
        );
    }

    private double ratio(long numerator, long denominator) {
        if (denominator <= 0) return 0D;
        return Math.round((double) numerator * 10000D / denominator) / 10000D;
    }
}
