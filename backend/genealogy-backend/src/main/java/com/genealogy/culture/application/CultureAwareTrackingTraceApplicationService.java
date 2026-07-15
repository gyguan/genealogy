package com.genealogy.culture.application;

import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CulturePermissionPolicyService;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.entity.MigrationEventEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.culture.repository.CultureTrackingQueryRepository;
import com.genealogy.culture.repository.MigrationEventRepository;
import com.genealogy.culture.repository.MigrationTrackingQueryRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.application.OperationLogBusinessViewApplicationService;
import com.genealogy.operationlog.dto.OperationLogResponse;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import com.genealogy.tracking.application.TrackingTraceApplicationService;
import com.genealogy.tracking.dto.TrackingObjectResponse;
import com.genealogy.tracking.dto.TrackingTraceDetailResponse;
import com.genealogy.tracking.dto.TrackingTraceDetailResponse.ReviewTaskItem;
import com.genealogy.tracking.dto.TrackingTraceDetailResponse.RevisionItem;
import com.genealogy.tracking.dto.TrackingTraceDetailResponse.SourceBindingItem;
import com.genealogy.tracking.dto.TrackingTraceDetailResponse.TimelineEvent;
import com.genealogy.tracking.dto.TrackingTraceDetailResponse.TraceCoverage;
import com.genealogy.tracking.repository.TrackingObjectQueryRepository;
import org.springframework.context.annotation.Primary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Primary
@Service
public class CultureAwareTrackingTraceApplicationService extends TrackingTraceApplicationService {

    private static final int LIMIT = 100;
    private static final int FETCH_LIMIT = 101;

    private final RbacAuthorizationApplicationService governedRbac;
    private final RevisionRepository governedRevisionRepository;
    private final ReviewTaskRepository governedReviewTaskRepository;
    private final SourceBindingRepository governedBindingRepository;
    private final OperationLogApplicationService governedOperationLog;
    private final OperationLogBusinessViewApplicationService governedLogView;
    private final AppUserRepository governedUserRepository;
    private final BranchRepository governedBranchRepository;
    private final CultureTrackingQueryRepository cultureTrackingQueryRepository;
    private final MigrationTrackingQueryRepository migrationTrackingQueryRepository;
    private final CultureItemRepository cultureItemRepository;
    private final MigrationEventRepository migrationEventRepository;
    private final SourceRepository sourceRepository;

    public CultureAwareTrackingTraceApplicationService(
            TrackingObjectQueryRepository trackingObjectQueryRepository,
            RbacAuthorizationApplicationService rbacAuthorizationApplicationService,
            RevisionRepository revisionRepository,
            ReviewTaskRepository reviewTaskRepository,
            SourceBindingRepository sourceBindingRepository,
            OperationLogApplicationService operationLogApplicationService,
            OperationLogBusinessViewApplicationService operationLogBusinessViewApplicationService,
            AppUserRepository appUserRepository,
            BranchRepository branchRepository,
            CultureTrackingQueryRepository cultureTrackingQueryRepository,
            MigrationTrackingQueryRepository migrationTrackingQueryRepository,
            CultureItemRepository cultureItemRepository,
            MigrationEventRepository migrationEventRepository,
            SourceRepository sourceRepository
    ) {
        super(
                trackingObjectQueryRepository,
                rbacAuthorizationApplicationService,
                revisionRepository,
                reviewTaskRepository,
                sourceBindingRepository,
                operationLogApplicationService,
                operationLogBusinessViewApplicationService,
                appUserRepository,
                branchRepository
        );
        this.governedRbac = rbacAuthorizationApplicationService;
        this.governedRevisionRepository = revisionRepository;
        this.governedReviewTaskRepository = reviewTaskRepository;
        this.governedBindingRepository = sourceBindingRepository;
        this.governedOperationLog = operationLogApplicationService;
        this.governedLogView = operationLogBusinessViewApplicationService;
        this.governedUserRepository = appUserRepository;
        this.governedBranchRepository = branchRepository;
        this.cultureTrackingQueryRepository = cultureTrackingQueryRepository;
        this.migrationTrackingQueryRepository = migrationTrackingQueryRepository;
        this.cultureItemRepository = cultureItemRepository;
        this.migrationEventRepository = migrationEventRepository;
        this.sourceRepository = sourceRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public TrackingTraceDetailResponse trace(
            Long clanId,
            Long actorId,
            String targetType,
            Long targetId,
            boolean includeTechnicalFields
    ) {
        String normalizedType = normalizeType(targetType);
        if (!"culture_item".equals(normalizedType) && !"migration_event".equals(normalizedType)) {
            return super.trace(clanId, actorId, targetType, targetId, includeTechnicalFields);
        }
        PermissionDataScope scope = governedRbac.permissionDataScope(actorId, clanId, PERMISSION_VIEW);
        if (!scope.fullClanAccess() && scope.visibleBranchIds().isEmpty()) throw notFound();
        boolean sensitiveAccess = governedRbac.hasPermission(
                actorId, clanId, CulturePermissionPolicyService.VIEW_SENSITIVE
        );
        TrackingObjectResponse summary;
        Long branchId;
        String currentStatus;
        if ("migration_event".equals(normalizedType)) {
            summary = migrationTrackingQueryRepository.findVisibleById(
                    clanId, targetId, scope.fullClanAccess(), scope.queryVisibleBranchIds(), sensitiveAccess
            ).orElseThrow(this::notFound);
            MigrationEventEntity event = migrationEventRepository.findByIdAndDeletedAtIsNull(targetId)
                    .filter(value -> Objects.equals(value.getClanId(), clanId))
                    .orElseThrow(this::notFound);
            branchId = event.getBranchId();
            currentStatus = event.getDataStatus();
        } else {
            summary = cultureTrackingQueryRepository.findVisibleById(
                    clanId, targetId, scope.fullClanAccess(), scope.queryVisibleBranchIds(), sensitiveAccess
            ).orElseThrow(this::notFound);
            CultureItemEntity item = cultureItemRepository.findByIdAndDeletedAtIsNull(targetId)
                    .filter(value -> Objects.equals(value.getClanId(), clanId))
                    .orElseThrow(this::notFound);
            branchId = item.getBranchId();
            currentStatus = item.getDataStatus();
        }
        return buildTrace(
                clanId, actorId, normalizedType, targetId, branchId, currentStatus,
                summary, scope, includeTechnicalFields
        );
    }

    private TrackingTraceDetailResponse buildTrace(
            Long clanId,
            Long actorId,
            String targetType,
            Long targetId,
            Long branchId,
            String currentStatus,
            TrackingObjectResponse summary,
            PermissionDataScope scope,
            boolean includeTechnicalFields
    ) {
        Page<RevisionEntity> revisionPage = governedRevisionRepository
                .findByClanIdAndTargetTypeAndTargetIdOrderBySubmitTimeDesc(
                        clanId, targetType, targetId, PageRequest.of(0, FETCH_LIMIT)
                );
        List<RevisionEntity> revisions = limit(revisionPage.getContent());
        List<Long> revisionIds = revisions.stream().map(RevisionEntity::getId).toList();
        Page<ReviewTaskEntity> taskPage = revisionIds.isEmpty()
                ? Page.empty()
                : scope.fullClanAccess()
                ? governedReviewTaskRepository.findByClanIdAndRevisionIdInOrderByCreatedAtDesc(
                        clanId, revisionIds, PageRequest.of(0, FETCH_LIMIT))
                : governedReviewTaskRepository.findByClanIdAndRevisionIdInAndBranchIdInOrderByCreatedAtDesc(
                        clanId, revisionIds, scope.queryVisibleBranchIds(), PageRequest.of(0, FETCH_LIMIT));
        List<ReviewTaskEntity> tasks = limit(taskPage.getContent());
        Page<SourceBindingEntity> bindingPage = governedBindingRepository
                .findByClanIdAndTargetTypeAndTargetIdOrderByCreatedAtDesc(
                        clanId, targetType, targetId, PageRequest.of(0, FETCH_LIMIT)
                );
        List<SourceBindingEntity> bindings = limit(bindingPage.getContent());

        PageResponse<OperationLogResponse> rawLogs = governedOperationLog.searchByTargets(
                clanId,
                Map.of(
                        targetType, List.of(targetId),
                        "revision", revisionIds,
                        "review_task", tasks.stream().map(ReviewTaskEntity::getId).toList()
                ),
                FETCH_LIMIT,
                includeTechnicalFields
        );
        PageResponse<OperationLogResponse> enrichedLogs = governedLogView.enrich(rawLogs, clanId, actorId);
        List<OperationLogResponse> logs = limit(enrichedLogs.records());
        Map<Long, String> actorNames = actorNames(revisions, tasks, bindings, logs);
        Map<Long, SourceEntity> sources = sourceRepository.findAllById(
                        bindings.stream().map(SourceBindingEntity::getSourceId).filter(Objects::nonNull).distinct().toList())
                .stream()
                .filter(source -> Objects.equals(source.getClanId(), clanId))
                .collect(Collectors.toMap(SourceEntity::getId, Function.identity()));
        String branchName = branchId == null ? null : governedBranchRepository
                .findByIdAndClanId(branchId, clanId)
                .map(BranchEntity::getBranchName)
                .orElse(null);

        List<RevisionItem> revisionItems = revisions.stream().map(revision -> new RevisionItem(
                revision.getId(), revision.getChangeType(), revision.getStatus(), revision.getDiffSummary(),
                actorNames.get(revision.getSubmitterId()), revision.getSubmitTime(), revision.getApprovedAt(),
                revision.getRejectedReason()
        )).toList();
        List<ReviewTaskItem> reviewTaskItems = tasks.stream().map(task -> new ReviewTaskItem(
                task.getId(), task.getRevisionId(), task.getReviewLevel(), task.getStatus(),
                actorNames.get(task.getReviewerId()), task.getReviewerRole(), branchName,
                task.getReviewComment(), task.getCreatedAt(), task.getReviewedAt()
        )).toList();
        List<SourceBindingItem> bindingItems = bindings.stream()
                .filter(binding -> sources.containsKey(binding.getSourceId()))
                .map(binding -> new SourceBindingItem(
                        binding.getId(), binding.getSourceId(), sources.get(binding.getSourceId()).getSourceName(),
                        binding.getTargetType(), summary.displayName(), binding.getBindingReason(),
                        binding.getConfidenceLevel(), binding.getBindingStatus(), actorNames.get(binding.getCreatedBy()),
                        binding.getCreatedAt(), binding.getUpdatedAt()
                )).toList();

        List<TimelineEvent> timeline = timeline(targetType, revisions, tasks, bindings, logs, actorNames);
        List<String> truncated = new ArrayList<>();
        addIf(truncated, "revisions", revisionPage.getTotalElements() > LIMIT);
        addIf(truncated, "reviewTasks", taskPage.getTotalElements() > LIMIT);
        addIf(truncated, "sourceBindings", bindingPage.getTotalElements() > LIMIT);
        addIf(truncated, "operationLogs", enrichedLogs.total() > LIMIT);
        List<String> notes = new ArrayList<>();
        if (!truncated.isEmpty()) notes.add("部分历史记录超过单段100条上限，响应仅返回最近记录");
        if (timeline.isEmpty()) notes.add("当前文化对象未发现可见历史事件");
        LocalDateTime historyFrom = timeline.stream().map(TimelineEvent::occurredAt)
                .filter(Objects::nonNull).min(LocalDateTime::compareTo).orElse(null);
        TraceCoverage coverage = new TraceCoverage(
                truncated.isEmpty() ? "complete" : "partial",
                truncated.isEmpty(),
                historyFrom,
                List.copyOf(truncated),
                List.of(),
                List.copyOf(notes)
        );
        List<String> allowedActions = includeTechnicalFields
                ? List.of(ACTION_VIEW_TRACE, ACTION_EXPORT_LOGS)
                : List.of(ACTION_VIEW_TRACE);
        return new TrackingTraceDetailResponse(
                summary, currentStatus, timeline, revisionItems, reviewTaskItems,
                bindingItems, logs, allowedActions, coverage
        );
    }

    private List<TimelineEvent> timeline(
            String targetType,
            List<RevisionEntity> revisions,
            List<ReviewTaskEntity> tasks,
            List<SourceBindingEntity> bindings,
            List<OperationLogResponse> logs,
            Map<Long, String> actors
    ) {
        String label = "migration_event".equals(targetType) ? "迁徙事件" : "文化资料";
        List<TimelineEvent> events = new ArrayList<>();
        revisions.forEach(revision -> events.add(new TimelineEvent(
                "revision:" + revision.getId(), "revision_submitted", "revision", revision.getId(),
                label + "变更已提交", revision.getDiffSummary(), revision.getSubmitTime(),
                actors.get(revision.getSubmitterId()), revision.getStatus()
        )));
        tasks.forEach(task -> events.add(new TimelineEvent(
                "review_task:" + task.getId(), task.getReviewedAt() == null ? "review_pending" : "review_decided",
                "review_task", task.getId(), task.getReviewedAt() == null ? "等待审核" : label + "审核已处理",
                task.getReviewComment(), task.getReviewedAt() == null ? task.getCreatedAt() : task.getReviewedAt(),
                actors.get(task.getReviewerId()), task.getStatus()
        )));
        bindings.forEach(binding -> events.add(new TimelineEvent(
                "source_binding:" + binding.getId(), "source_bound", "source_binding", binding.getId(),
                "来源证据已关联", binding.getBindingReason(),
                binding.getUpdatedAt() == null ? binding.getCreatedAt() : binding.getUpdatedAt(),
                actors.get(binding.getCreatedBy()), binding.getBindingStatus()
        )));
        logs.forEach(log -> events.add(new TimelineEvent(
                "operation_log:" + log.id(), "operation_logged", "operation_log", log.id(),
                log.summary(), log.detail(), log.createdAt(), log.actorDisplayName(), log.resultStatus()
        )));
        LinkedHashMap<String, TimelineEvent> unique = new LinkedHashMap<>();
        events.stream()
                .sorted(Comparator.comparing(
                        TimelineEvent::occurredAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ).thenComparing(TimelineEvent::eventKey))
                .forEach(event -> unique.putIfAbsent(event.eventKey(), event));
        return unique.values().stream().limit(LIMIT).toList();
    }

    private Map<Long, String> actorNames(
            List<RevisionEntity> revisions,
            List<ReviewTaskEntity> tasks,
            List<SourceBindingEntity> bindings,
            List<OperationLogResponse> logs
    ) {
        LinkedHashSet<Long> ids = new LinkedHashSet<>();
        revisions.forEach(value -> ids.add(value.getSubmitterId()));
        tasks.forEach(value -> ids.add(value.getReviewerId()));
        bindings.forEach(value -> ids.add(value.getCreatedBy()));
        logs.forEach(value -> ids.add(value.actorId()));
        ids.remove(null);
        return governedUserRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(AppUserEntity::getId, AppUserEntity::getDisplayName));
    }

    private <T> List<T> limit(List<T> values) {
        return values == null ? List.of() : values.stream().limit(LIMIT).toList();
    }

    private void addIf(List<String> values, String value, boolean condition) {
        if (condition) values.add(value);
    }

    private String normalizeType(String value) {
        String normalized = value == null ? "" : value.trim().toLowerCase();
        return switch (normalized) {
            case "culture_items" -> "culture_item";
            case "migration_events" -> "migration_event";
            default -> normalized;
        };
    }

    private BusinessException notFound() {
        return new BusinessException("TRACKING_OBJECT_NOT_FOUND", "追踪对象不存在或当前用户不可见");
    }
}
