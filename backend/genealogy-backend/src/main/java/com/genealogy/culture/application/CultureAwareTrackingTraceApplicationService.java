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
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.culture.repository.CultureTrackingQueryRepository;
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
import com.genealogy.tracking.dto.TrackingTraceDetailResponse.ChangeChain;
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
import java.util.Set;
import java.util.UUID;
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
    private final CultureItemRepository cultureItemRepository;
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
            CultureItemRepository cultureItemRepository,
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
        this.cultureItemRepository = cultureItemRepository;
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
        if (!"culture_item".equals(normalize(targetType)) && !"culture_items".equals(normalize(targetType))) {
            return super.trace(clanId, actorId, targetType, targetId, includeTechnicalFields);
        }
        PermissionDataScope scope = governedRbac.permissionDataScope(actorId, clanId, PERMISSION_VIEW);
        if (!scope.fullClanAccess() && scope.visibleBranchIds().isEmpty()) throw notFound();
        boolean sensitiveAccess = governedRbac.hasPermission(
                actorId, clanId, CulturePermissionPolicyService.VIEW_SENSITIVE
        );
        TrackingObjectResponse summary = cultureTrackingQueryRepository.findVisibleById(
                clanId, targetId, scope.fullClanAccess(), scope.queryVisibleBranchIds(), sensitiveAccess
        ).orElseThrow(this::notFound);
        CultureItemEntity item = cultureItemRepository.findByIdAndDeletedAtIsNull(targetId)
                .filter(value -> Objects.equals(value.getClanId(), clanId))
                .orElseThrow(this::notFound);

        Page<RevisionEntity> revisionPage = governedRevisionRepository
                .findByClanIdAndTargetTypeAndTargetIdOrderBySubmitTimeDesc(
                        clanId, "culture_item", targetId, PageRequest.of(0, FETCH_LIMIT)
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
                        clanId, "culture_item", targetId, PageRequest.of(0, FETCH_LIMIT)
                );
        List<SourceBindingEntity> bindings = limit(bindingPage.getContent());

        PageResponse<OperationLogResponse> rawLogs = governedOperationLog.searchByTargets(
                clanId,
                Map.of(
                        "culture_item", List.of(targetId),
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
                bindings.stream().map(SourceBindingEntity::getSourceId).filter(Objects::nonNull).distinct().toList()
        ).stream().filter(source -> Objects.equals(source.getClanId(), clanId))
                .collect(Collectors.toMap(SourceEntity::getId, Function.identity()));
        String branchName = item.getBranchId() == null ? null : governedBranchRepository
                .findByIdAndClanId(item.getBranchId(), clanId)
                .map(BranchEntity::getBranchName)
                .orElse(null);

        List<RevisionItem> revisionItems = revisions.stream().map(revision -> new RevisionItem(
                revision.getId(), revision.getChangeType(), revision.getStatus(), revision.getDiffSummary(),
                actorNames.get(revision.getSubmitterId()), revision.getSubmitTime(), revision.getApprovedAt(),
                revision.getRejectedReason(), revision.getTraceId()
        )).toList();
        List<ReviewTaskItem> reviewTaskItems = tasks.stream().map(task -> new ReviewTaskItem(
                task.getId(), task.getRevisionId(), task.getReviewLevel(), task.getStatus(),
                actorNames.get(task.getReviewerId()), task.getReviewerRole(), branchName,
                task.getReviewComment(), task.getCreatedAt(), task.getReviewedAt(), task.getTraceId()
        )).toList();
        List<SourceBindingItem> bindingItems = bindings.stream()
                .filter(binding -> sources.containsKey(binding.getSourceId()))
                .map(binding -> new SourceBindingItem(
                        binding.getId(), binding.getSourceId(), sources.get(binding.getSourceId()).getSourceName(),
                        binding.getTargetType(), summary.displayName(), binding.getBindingReason(),
                        binding.getConfidenceLevel(), binding.getBindingStatus(), actorNames.get(binding.getCreatedBy()),
                        binding.getCreatedAt(), binding.getUpdatedAt()
                )).toList();

        List<TimelineEvent> timeline = timeline(revisions, tasks, bindings, logs, actorNames);
        List<ChangeChain> changeChains = changeChains(revisions, tasks, timeline);
        List<String> truncated = new ArrayList<>();
        addIf(truncated, "revisions", revisionPage.getTotalElements() > LIMIT);
        addIf(truncated, "reviewTasks", taskPage.getTotalElements() > LIMIT);
        addIf(truncated, "sourceBindings", bindingPage.getTotalElements() > LIMIT);
        addIf(truncated, "operationLogs", enrichedLogs.total() > LIMIT);
        List<String> notes = new ArrayList<>();
        if (!truncated.isEmpty()) notes.add("部分历史记录超过单段100条上限，响应仅返回最近记录");
        if (timeline.isEmpty()) notes.add("当前文化资料未发现可见历史事件");
        LocalDateTime historyFrom = timeline.stream().map(TimelineEvent::occurredAt)
                .filter(Objects::nonNull).min(LocalDateTime::compareTo).orElse(null);
        boolean legacyTrace = revisions.stream().anyMatch(revision -> revision.getTraceId() == null);
        List<String> missing = legacyTrace ? List.of("traceIds") : List.of();
        if (legacyTrace) notes.add("部分历史文化资料版本缺少稳定 trace_id，按独立 legacy 链路展示");
        boolean complete = truncated.isEmpty() && missing.isEmpty();
        TraceCoverage coverage = new TraceCoverage(
                complete ? "complete" : "partial",
                complete,
                historyFrom,
                List.copyOf(truncated),
                missing,
                List.copyOf(notes)
        );
        List<String> allowedActions = includeTechnicalFields
                ? List.of(ACTION_VIEW_TRACE, ACTION_EXPORT_LOGS)
                : List.of(ACTION_VIEW_TRACE);
        return new TrackingTraceDetailResponse(
                summary, item.getDataStatus(), timeline, changeChains, revisionItems, reviewTaskItems,
                bindingItems, logs, allowedActions, coverage
        );
    }

    private List<TimelineEvent> timeline(
            List<RevisionEntity> revisions,
            List<ReviewTaskEntity> tasks,
            List<SourceBindingEntity> bindings,
            List<OperationLogResponse> logs,
            Map<Long, String> actors
    ) {
        List<TimelineEvent> events = new ArrayList<>();
        revisions.forEach(revision -> events.add(new TimelineEvent(
                "revision:" + revision.getId(), "revision_submitted", "revision", revision.getId(),
                "文化资料变更已提交", revision.getDiffSummary(), revision.getSubmitTime(),
                actors.get(revision.getSubmitterId()), revision.getStatus(), revision.getTraceId(),
                revision.getId(), null, "submitted"
        )));
        tasks.forEach(task -> events.add(new TimelineEvent(
                "review_task:" + task.getId(), task.getReviewedAt() == null ? "review_pending" : "review_decided",
                "review_task", task.getId(), task.getReviewedAt() == null ? "等待审核" : "文化资料审核已处理",
                task.getReviewComment(), task.getReviewedAt() == null ? task.getCreatedAt() : task.getReviewedAt(),
                actors.get(task.getReviewerId()), task.getStatus(), task.getTraceId(), task.getRevisionId(),
                task.getId(), task.getReviewedAt() == null ? "submitted" : task.getStatus()
        )));
        bindings.forEach(binding -> events.add(new TimelineEvent(
                "source_binding:" + binding.getId(), "source_bound", "source_binding", binding.getId(),
                "来源证据已关联", binding.getBindingReason(), binding.getUpdatedAt() == null ? binding.getCreatedAt() : binding.getUpdatedAt(),
                actors.get(binding.getCreatedBy()), binding.getBindingStatus(), null, null, null, null
        )));
        logs.forEach(log -> events.add(new TimelineEvent(
                "operation_log:" + log.id(), "operation_logged", "operation_log", log.id(),
                log.summary(), log.detail(), log.createdAt(), log.actorDisplayName(), log.resultStatus(),
                log.traceId(), log.revisionId(), log.reviewTaskId(), log.eventResult()
        )));
        LinkedHashMap<String, TimelineEvent> unique = new LinkedHashMap<>();
        events.stream()
                .sorted(Comparator.comparing(TimelineEvent::occurredAt,
                        Comparator.nullsLast(Comparator.reverseOrder())).thenComparing(TimelineEvent::eventKey))
                .forEach(event -> unique.putIfAbsent(event.eventKey(), event));
        return unique.values().stream().limit(LIMIT).toList();
    }

    private List<ChangeChain> changeChains(
            List<RevisionEntity> revisions,
            List<ReviewTaskEntity> tasks,
            List<TimelineEvent> timeline
    ) {
        Map<Long, List<ReviewTaskEntity>> tasksByRevision = tasks.stream()
                .filter(task -> task.getRevisionId() != null)
                .collect(Collectors.groupingBy(ReviewTaskEntity::getRevisionId));
        return revisions.stream().map(revision -> {
            List<ReviewTaskEntity> related = tasksByRevision.getOrDefault(revision.getId(), List.of());
            List<Long> taskIds = related.stream().map(ReviewTaskEntity::getId).filter(Objects::nonNull).toList();
            UUID traceId = revision.getTraceId();
            boolean inconsistent = traceId != null && related.stream().anyMatch(task -> !traceId.equals(task.getTraceId()));
            List<TimelineEvent> events = timeline.stream().filter(event ->
                    traceId != null && traceId.equals(event.traceId())
                            || Objects.equals(revision.getId(), event.revisionId())
                            || event.reviewTaskId() != null && taskIds.contains(event.reviewTaskId())
            ).toList();
            LocalDateTime completedAt = events.stream().map(TimelineEvent::occurredAt)
                    .filter(Objects::nonNull).max(LocalDateTime::compareTo).orElse(revision.getApprovedAt());
            return new ChangeChain(
                    traceId == null ? "legacy-revision:" + revision.getId() : "trace:" + traceId,
                    traceId, traceId == null ? "legacy_partial" : inconsistent ? "inconsistent" : "complete",
                    revision.getId(), taskIds, revision.getTargetType(), revision.getTargetId(), revision.getStatus(),
                    revision.getSubmitTime(), completedAt, events.stream().map(TimelineEvent::eventKey).toList()
            );
        }).sorted(Comparator.comparing(ChangeChain::startedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
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

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private BusinessException notFound() {
        return new BusinessException("TRACKING_OBJECT_NOT_FOUND", "追踪对象不存在或当前用户不可见");
    }
}
