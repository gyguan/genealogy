package com.genealogy.tracking.application;

import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.application.OperationLogBusinessViewApplicationService;
import com.genealogy.operationlog.dto.OperationLogResponse;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.tracking.dto.TrackingObjectResponse;
import com.genealogy.tracking.dto.TrackingTraceDetailResponse;
import com.genealogy.tracking.dto.TrackingTraceDetailResponse.ReviewTaskItem;
import com.genealogy.tracking.dto.TrackingTraceDetailResponse.RevisionItem;
import com.genealogy.tracking.dto.TrackingTraceDetailResponse.SourceBindingItem;
import com.genealogy.tracking.dto.TrackingTraceDetailResponse.TimelineEvent;
import com.genealogy.tracking.dto.TrackingTraceDetailResponse.TraceCoverage;
import com.genealogy.tracking.repository.TrackingObjectQueryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TrackingTraceApplicationService {

    public static final String PERMISSION_VIEW = "operation_log.view";
    public static final String ACTION_VIEW_TRACE = "view_trace";
    public static final String ACTION_EXPORT_LOGS = "export_operation_logs";

    private static final int SEGMENT_LIMIT = 100;
    private static final int FETCH_LIMIT = SEGMENT_LIMIT + 1;
    private static final Set<String> OBJECT_TYPES = Set.of(
            "person", "relationship", "source", "branch", "review_task"
    );

    private final TrackingObjectQueryRepository trackingObjectQueryRepository;
    private final RbacAuthorizationApplicationService rbacAuthorizationApplicationService;
    private final RevisionRepository revisionRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final SourceBindingRepository sourceBindingRepository;
    private final OperationLogApplicationService operationLogApplicationService;
    private final OperationLogBusinessViewApplicationService operationLogBusinessViewApplicationService;
    private final AppUserRepository appUserRepository;
    private final BranchRepository branchRepository;

    public TrackingTraceApplicationService(
            TrackingObjectQueryRepository trackingObjectQueryRepository,
            RbacAuthorizationApplicationService rbacAuthorizationApplicationService,
            RevisionRepository revisionRepository,
            ReviewTaskRepository reviewTaskRepository,
            SourceBindingRepository sourceBindingRepository,
            OperationLogApplicationService operationLogApplicationService,
            OperationLogBusinessViewApplicationService operationLogBusinessViewApplicationService,
            AppUserRepository appUserRepository,
            BranchRepository branchRepository
    ) {
        this.trackingObjectQueryRepository = trackingObjectQueryRepository;
        this.rbacAuthorizationApplicationService = rbacAuthorizationApplicationService;
        this.revisionRepository = revisionRepository;
        this.reviewTaskRepository = reviewTaskRepository;
        this.sourceBindingRepository = sourceBindingRepository;
        this.operationLogApplicationService = operationLogApplicationService;
        this.operationLogBusinessViewApplicationService = operationLogBusinessViewApplicationService;
        this.appUserRepository = appUserRepository;
        this.branchRepository = branchRepository;
    }

    @Transactional(readOnly = true)
    public TrackingTraceDetailResponse trace(
            Long clanId,
            Long actorId,
            String targetType,
            Long targetId,
            boolean includeTechnicalFields
    ) {
        if (clanId == null || targetId == null) {
            throw new BusinessException("TRACKING_TARGET_REQUIRED", "追踪对象不能为空");
        }
        String normalizedType = normalizeObjectType(targetType);
        PermissionDataScope scope = rbacAuthorizationApplicationService.permissionDataScope(
                actorId,
                clanId,
                PERMISSION_VIEW
        );
        if (!scope.fullClanAccess() && scope.visibleBranchIds().isEmpty()) {
            throw notFound();
        }

        TrackingObjectResponse requestedSummary = visibleObject(
                clanId,
                normalizedType,
                targetId,
                scope
        ).orElseThrow(this::notFound);

        TraceSubject subject = resolveSubject(clanId, normalizedType, targetId, requestedSummary, scope);
        Segment<RevisionEntity> revisionSegment = loadRevisions(clanId, subject);
        Segment<ReviewTaskEntity> reviewTaskSegment = loadReviewTasks(clanId, subject, revisionSegment.records());
        Segment<SourceBindingEntity> bindingSegment = loadBindings(clanId, subject);

        List<SourceBindingItem> bindingItems = visibleBindingItems(
                clanId,
                actorId,
                bindingSegment.records(),
                scope
        );
        Set<Long> visibleBindingIds = bindingItems.stream()
                .map(SourceBindingItem::id)
                .collect(Collectors.toSet());
        List<SourceBindingEntity> visibleBindingEntities = bindingSegment.records().stream()
                .filter(binding -> visibleBindingIds.contains(binding.getId()))
                .toList();

        Map<String, Collection<Long>> logTargets = logTargets(subject, reviewTaskSegment.records());
        PageResponse<OperationLogResponse> rawLogPage = operationLogApplicationService.searchByTargets(
                clanId,
                logTargets,
                FETCH_LIMIT,
                includeTechnicalFields
        );
        PageResponse<OperationLogResponse> enrichedLogPage = operationLogBusinessViewApplicationService.enrich(
                rawLogPage,
                clanId,
                actorId
        );
        boolean logsTruncated = enrichedLogPage.total() > SEGMENT_LIMIT;
        List<OperationLogResponse> logs = limit(enrichedLogPage.records());

        Map<Long, String> actorNames = actorNames(
                revisionSegment.records(),
                reviewTaskSegment.records(),
                visibleBindingEntities
        );
        Map<Long, String> branchNames = branchNames(clanId, reviewTaskSegment.records());

        List<RevisionItem> revisions = revisionSegment.records().stream()
                .map(revision -> toRevisionItem(revision, actorNames))
                .toList();
        List<ReviewTaskItem> reviewTasks = reviewTaskSegment.records().stream()
                .map(task -> toReviewTaskItem(task, actorNames, branchNames))
                .toList();

        List<TimelineEvent> timeline = buildTimeline(
                revisionSegment.records(),
                reviewTaskSegment.records(),
                visibleBindingEntities,
                logs,
                actorNames
        );

        List<String> truncatedSegments = new ArrayList<>();
        addIf(truncatedSegments, "revisions", revisionSegment.truncated());
        addIf(truncatedSegments, "reviewTasks", reviewTaskSegment.truncated());
        addIf(truncatedSegments, "sourceBindings", bindingSegment.truncated());
        addIf(truncatedSegments, "operationLogs", logsTruncated);

        List<String> missingSegments = new ArrayList<>();
        List<String> notes = new ArrayList<>();
        if (subject.brokenReference()) {
            missingSegments.add("revisions");
            notes.add("审核事项缺少可用的版本记录，无法完整还原审核链路");
        }
        if (!revisionSegment.records().isEmpty() && reviewTaskSegment.records().isEmpty()) {
            missingSegments.add("reviewTasks");
            notes.add("已找到版本记录，但未找到对应审核事项");
        }
        if (bindingSegment.records().size() > visibleBindingEntities.size()) {
            notes.add("部分来源绑定因当前权限或隐私规则未返回");
        }
        if (!truncatedSegments.isEmpty()) {
            notes.add("部分历史记录超过单段100条上限，响应仅返回最近记录");
        }
        if (timeline.isEmpty()) {
            notes.add("当前对象未发现可见历史事件");
        }

        TraceCoverage coverage = coverage(timeline, truncatedSegments, missingSegments, notes);
        List<String> allowedActions = includeTechnicalFields
                ? List.of(ACTION_VIEW_TRACE, ACTION_EXPORT_LOGS)
                : List.of(ACTION_VIEW_TRACE);

        return new TrackingTraceDetailResponse(
                requestedSummary,
                requestedSummary.status(),
                timeline,
                revisions,
                reviewTasks,
                bindingItems,
                logs,
                allowedActions,
                coverage
        );
    }

    private TraceSubject resolveSubject(
            Long clanId,
            String targetType,
            Long targetId,
            TrackingObjectResponse requestedSummary,
            PermissionDataScope scope
    ) {
        if (!"review_task".equals(targetType)) {
            return new TraceSubject(
                    targetType,
                    targetId,
                    requestedSummary,
                    null,
                    null,
                    false
            );
        }
        ReviewTaskEntity task = reviewTaskRepository.findById(targetId)
                .filter(item -> clanId.equals(item.getClanId()))
                .orElseThrow(this::notFound);
        RevisionEntity revision = task.getRevisionId() == null
                ? null
                : revisionRepository.findById(task.getRevisionId())
                .filter(item -> clanId.equals(item.getClanId()))
                .orElse(null);
        if (revision == null || revision.getTargetType() == null || revision.getTargetId() == null) {
            return new TraceSubject(targetType, targetId, requestedSummary, task, revision, true);
        }
        String businessType = normalizeObjectType(revision.getTargetType());
        TrackingObjectResponse businessSummary = visibleObject(
                clanId,
                businessType,
                revision.getTargetId(),
                scope
        ).orElseThrow(this::notFound);
        return new TraceSubject(
                businessType,
                revision.getTargetId(),
                businessSummary,
                task,
                revision,
                false
        );
    }

    private Segment<RevisionEntity> loadRevisions(Long clanId, TraceSubject subject) {
        if (subject.selectedRevision() != null) {
            return new Segment<>(List.of(subject.selectedRevision()), false);
        }
        if (subject.brokenReference()) {
            return new Segment<>(List.of(), false);
        }
        Page<RevisionEntity> page = revisionRepository
                .findByClanIdAndTargetTypeAndTargetIdOrderBySubmitTimeDesc(
                        clanId,
                        subject.businessType(),
                        subject.businessId(),
                        PageRequest.of(0, FETCH_LIMIT)
                );
        return new Segment<>(limit(page.getContent()), page.getTotalElements() > SEGMENT_LIMIT);
    }

    private Segment<ReviewTaskEntity> loadReviewTasks(
            Long clanId,
            TraceSubject subject,
            List<RevisionEntity> revisions
    ) {
        if (subject.selectedTask() != null) {
            return new Segment<>(List.of(subject.selectedTask()), false);
        }
        List<Long> revisionIds = revisions.stream()
                .map(RevisionEntity::getId)
                .filter(Objects::nonNull)
                .toList();
        if (revisionIds.isEmpty()) {
            return new Segment<>(List.of(), false);
        }
        Page<ReviewTaskEntity> page = reviewTaskRepository
                .findByClanIdAndRevisionIdInOrderByCreatedAtDesc(
                        clanId,
                        revisionIds,
                        PageRequest.of(0, FETCH_LIMIT)
                );
        return new Segment<>(limit(page.getContent()), page.getTotalElements() > SEGMENT_LIMIT);
    }

    private Segment<SourceBindingEntity> loadBindings(Long clanId, TraceSubject subject) {
        if (subject.brokenReference()) {
            return new Segment<>(List.of(), false);
        }
        Page<SourceBindingEntity> page = "source".equals(subject.businessType())
                ? sourceBindingRepository.findByClanIdAndSourceIdOrderByCreatedAtDesc(
                        clanId,
                        subject.businessId(),
                        PageRequest.of(0, FETCH_LIMIT)
                )
                : sourceBindingRepository.findByClanIdAndTargetTypeAndTargetIdOrderByCreatedAtDesc(
                        clanId,
                        subject.businessType(),
                        subject.businessId(),
                        PageRequest.of(0, FETCH_LIMIT)
                );
        return new Segment<>(limit(page.getContent()), page.getTotalElements() > SEGMENT_LIMIT);
    }

    private List<SourceBindingItem> visibleBindingItems(
            Long clanId,
            Long actorId,
            List<SourceBindingEntity> bindings,
            PermissionDataScope scope
    ) {
        if (bindings.isEmpty()) {
            return List.of();
        }
        Map<Long, TrackingObjectResponse> sources = visibleObjects(
                clanId,
                "source",
                bindings.stream().map(SourceBindingEntity::getSourceId).toList(),
                scope
        );
        Map<String, Map<Long, TrackingObjectResponse>> targets = new HashMap<>();
        bindings.stream()
                .filter(binding -> binding.getTargetType() != null && binding.getTargetId() != null)
                .collect(Collectors.groupingBy(
                        binding -> normalizeObjectType(binding.getTargetType()),
                        Collectors.mapping(SourceBindingEntity::getTargetId, Collectors.toCollection(LinkedHashSet::new))
                ))
                .forEach((type, ids) -> targets.put(type, visibleObjects(clanId, type, ids, scope)));
        Map<Long, String> creators = actorNames(bindings.stream()
                .map(SourceBindingEntity::getCreatedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet()));

        List<SourceBindingItem> result = new ArrayList<>();
        for (SourceBindingEntity binding : bindings) {
            TrackingObjectResponse source = sources.get(binding.getSourceId());
            String targetType = binding.getTargetType() == null ? null : normalizeObjectType(binding.getTargetType());
            TrackingObjectResponse target = targetType == null || binding.getTargetId() == null
                    ? null
                    : targets.getOrDefault(targetType, Map.of()).get(binding.getTargetId());
            if (source == null || target == null) {
                continue;
            }
            result.add(new SourceBindingItem(
                    binding.getId(),
                    binding.getSourceId(),
                    source.displayName(),
                    targetType,
                    target.displayName(),
                    binding.getBindingReason(),
                    binding.getConfidenceLevel(),
                    binding.getBindingStatus(),
                    displayName(creators, binding.getCreatedBy()),
                    binding.getCreatedAt(),
                    binding.getUpdatedAt()
            ));
        }
        return List.copyOf(result);
    }

    private Map<String, Collection<Long>> logTargets(
            TraceSubject subject,
            List<ReviewTaskEntity> reviewTasks
    ) {
        Map<String, Collection<Long>> targets = new LinkedHashMap<>();
        if (!subject.brokenReference()) {
            targets.put(subject.businessType(), List.of(subject.businessId()));
        }
        LinkedHashSet<Long> taskIds = reviewTasks.stream()
                .map(ReviewTaskEntity::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (subject.selectedTask() != null && subject.selectedTask().getId() != null) {
            taskIds.add(subject.selectedTask().getId());
        }
        if (!taskIds.isEmpty()) {
            targets.put("review_task", taskIds);
        }
        return targets;
    }

    private Map<Long, String> actorNames(
            List<RevisionEntity> revisions,
            List<ReviewTaskEntity> reviewTasks,
            List<SourceBindingEntity> bindings
    ) {
        Set<Long> ids = new LinkedHashSet<>();
        revisions.stream().map(RevisionEntity::getSubmitterId).filter(Objects::nonNull).forEach(ids::add);
        reviewTasks.stream().map(ReviewTaskEntity::getReviewerId).filter(Objects::nonNull).forEach(ids::add);
        bindings.stream().map(SourceBindingEntity::getCreatedBy).filter(Objects::nonNull).forEach(ids::add);
        return actorNames(ids);
    }

    private Map<Long, String> actorNames(Collection<Long> actorIds) {
        if (actorIds == null || actorIds.isEmpty()) {
            return Map.of();
        }
        return appUserRepository.findAllById(actorIds).stream()
                .filter(user -> user.getDeletedAt() == null)
                .collect(Collectors.toMap(
                        AppUserEntity::getId,
                        user -> nonBlank(user.getDisplayName(), "未知操作者"),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
    }

    private Map<Long, String> branchNames(Long clanId, List<ReviewTaskEntity> reviewTasks) {
        Set<Long> branchIds = reviewTasks.stream()
                .map(ReviewTaskEntity::getBranchId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (branchIds.isEmpty()) {
            return Map.of();
        }
        return branchRepository.findAllById(branchIds).stream()
                .filter(branch -> clanId.equals(branch.getClanId()))
                .collect(Collectors.toMap(
                        BranchEntity::getId,
                        branch -> nonBlank(branch.getBranchName(), "未命名支派"),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
    }

    private RevisionItem toRevisionItem(RevisionEntity revision, Map<Long, String> actorNames) {
        return new RevisionItem(
                revision.getId(),
                nonBlank(revision.getChangeType(), "unknown"),
                nonBlank(revision.getStatus(), "unknown"),
                revision.getDiffSummary(),
                displayName(actorNames, revision.getSubmitterId()),
                revision.getSubmitTime(),
                revision.getApprovedAt(),
                revision.getRejectedReason()
        );
    }

    private ReviewTaskItem toReviewTaskItem(
            ReviewTaskEntity task,
            Map<Long, String> actorNames,
            Map<Long, String> branchNames
    ) {
        return new ReviewTaskItem(
                task.getId(),
                task.getRevisionId(),
                task.getReviewLevel(),
                nonBlank(task.getStatus(), "unknown"),
                displayName(actorNames, task.getReviewerId()),
                task.getReviewerRole(),
                branchNames.get(task.getBranchId()),
                task.getReviewComment(),
                task.getCreatedAt(),
                task.getReviewedAt()
        );
    }

    private List<TimelineEvent> buildTimeline(
            List<RevisionEntity> revisions,
            List<ReviewTaskEntity> reviewTasks,
            List<SourceBindingEntity> bindings,
            List<OperationLogResponse> logs,
            Map<Long, String> actorNames
    ) {
        Map<String, TimelineEvent> events = new LinkedHashMap<>();
        revisions.forEach(revision -> addEvent(events, new TimelineEvent(
                "revision:" + revision.getId() + ":submitted",
                "REVISION_SUBMITTED",
                "revision",
                revision.getId(),
                "提交版本变更",
                revision.getDiffSummary(),
                revision.getSubmitTime(),
                displayName(actorNames, revision.getSubmitterId()),
                revision.getStatus()
        )));
        reviewTasks.forEach(task -> {
            addEvent(events, new TimelineEvent(
                    "review:" + task.getId() + ":requested",
                    "REVIEW_REQUESTED",
                    "review_task",
                    task.getId(),
                    "发起审核",
                    task.getReviewComment(),
                    task.getCreatedAt(),
                    null,
                    task.getStatus()
            ));
            String status = normalizeOptional(task.getStatus());
            if ("approved".equals(status) || "rejected".equals(status)) {
                addEvent(events, new TimelineEvent(
                        "review:" + task.getId() + ":result",
                        "approved".equals(status) ? "REVIEW_APPROVED" : "REVIEW_REJECTED",
                        "review_task",
                        task.getId(),
                        "approved".equals(status) ? "审核通过" : "审核驳回",
                        task.getReviewComment(),
                        task.getReviewedAt(),
                        displayName(actorNames, task.getReviewerId()),
                        task.getStatus()
                ));
            }
        });
        bindings.forEach(binding -> addEvent(events, new TimelineEvent(
                "binding:" + binding.getId() + ":" + nonBlank(binding.getBindingStatus(), "unknown"),
                isBindingUpdated(binding) ? "SOURCE_BINDING_UPDATED" : "SOURCE_BOUND",
                "source_binding",
                binding.getId(),
                isBindingUpdated(binding) ? "更新来源绑定" : "绑定来源资料",
                binding.getBindingReason(),
                isBindingUpdated(binding) ? binding.getUpdatedAt() : binding.getCreatedAt(),
                displayName(actorNames, binding.getCreatedBy()),
                binding.getBindingStatus()
        )));
        logs.forEach(log -> addEvent(events, logEvent(log)));
        return events.values().stream()
                .sorted(Comparator.comparing(
                                TimelineEvent::occurredAt,
                                Comparator.nullsLast(Comparator.naturalOrder())
                        )
                        .thenComparing(TimelineEvent::eventKey))
                .toList();
    }

    private TimelineEvent logEvent(OperationLogResponse log) {
        String action = normalizeOptional(log.actionType());
        String eventKey = "log:" + log.id();
        if ("review_task".equals(normalizeOptional(log.targetType())) && log.targetId() != null) {
            if ("review_submit".equals(action)) {
                eventKey = "review:" + log.targetId() + ":requested";
            } else if ("review_approve".equals(action) || "review_reject".equals(action)) {
                eventKey = "review:" + log.targetId() + ":result";
            }
        }
        return new TimelineEvent(
                eventKey,
                operationEventType(action),
                "operation_log",
                log.id(),
                operationTitle(action),
                nonBlank(log.targetSummary(), log.summary()),
                log.createdAt(),
                nonBlank(log.actorDisplayName(), "未知操作者"),
                log.resultStatus()
        );
    }

    private String operationEventType(String actionType) {
        if (actionType == null) {
            return "OPERATION_RECORDED";
        }
        if (actionType.contains("import")) {
            return "IMPORT_COMPLETED";
        }
        if (actionType.endsWith("_create") || actionType.endsWith("_created")) {
            return "OBJECT_CREATED";
        }
        if (actionType.endsWith("_update") || actionType.endsWith("_updated")) {
            return "OBJECT_UPDATED";
        }
        if (actionType.endsWith("_delete") || actionType.endsWith("_deleted")) {
            return "OBJECT_DELETED";
        }
        return "OPERATION_RECORDED";
    }

    private String operationTitle(String actionType) {
        if (actionType == null) {
            return "记录业务操作";
        }
        return switch (actionType) {
            case "person_create" -> "创建人物";
            case "person_update" -> "更新人物";
            case "person_delete" -> "删除人物";
            case "relationship_create" -> "创建关系";
            case "relationship_update" -> "更新关系";
            case "relationship_delete" -> "删除关系";
            case "source_create" -> "创建来源";
            case "source_update" -> "更新来源";
            case "source_binding_create" -> "绑定来源";
            case "person_csv_import" -> "完成人物导入";
            case "relationship_csv_import" -> "完成关系导入";
            default -> actionType;
        };
    }

    private TraceCoverage coverage(
            List<TimelineEvent> timeline,
            List<String> truncatedSegments,
            List<String> missingSegments,
            List<String> notes
    ) {
        LocalDateTime historyFrom = timeline.stream()
                .map(TimelineEvent::occurredAt)
                .filter(Objects::nonNull)
                .min(LocalDateTime::compareTo)
                .orElse(null);
        if (timeline.isEmpty()) {
            return new TraceCoverage(
                    "minimal",
                    false,
                    historyFrom,
                    List.copyOf(truncatedSegments),
                    List.copyOf(missingSegments),
                    List.copyOf(notes)
            );
        }
        boolean complete = truncatedSegments.isEmpty() && missingSegments.isEmpty();
        return new TraceCoverage(
                complete ? "complete" : "partial",
                complete,
                historyFrom,
                List.copyOf(truncatedSegments),
                List.copyOf(missingSegments),
                List.copyOf(notes)
        );
    }

    private Optional<TrackingObjectResponse> visibleObject(
            Long clanId,
            String targetType,
            Long targetId,
            PermissionDataScope scope
    ) {
        return trackingObjectQueryRepository.findVisibleById(
                clanId,
                targetType,
                targetId,
                scope.fullClanAccess(),
                scope.queryVisibleBranchIds()
        );
    }

    private Map<Long, TrackingObjectResponse> visibleObjects(
            Long clanId,
            String targetType,
            Collection<Long> targetIds,
            PermissionDataScope scope
    ) {
        if (targetIds == null || targetIds.isEmpty()) {
            return Map.of();
        }
        return trackingObjectQueryRepository.findVisibleByIds(
                        clanId,
                        targetType,
                        targetIds,
                        scope.fullClanAccess(),
                        scope.queryVisibleBranchIds()
                ).stream()
                .collect(Collectors.toMap(
                        TrackingObjectResponse::objectId,
                        Function.identity(),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
    }

    private void addEvent(Map<String, TimelineEvent> events, TimelineEvent event) {
        events.putIfAbsent(event.eventKey(), event);
    }

    private boolean isBindingUpdated(SourceBindingEntity binding) {
        return binding.getUpdatedAt() != null
                && (binding.getCreatedAt() == null || binding.getUpdatedAt().isAfter(binding.getCreatedAt()));
    }

    private void addIf(List<String> segments, String value, boolean condition) {
        if (condition) {
            segments.add(value);
        }
    }

    private String displayName(Map<Long, String> names, Long id) {
        return id == null ? "未知操作者" : names.getOrDefault(id, "未知操作者");
    }

    private String nonBlank(String preferred, String fallback) {
        return preferred == null || preferred.isBlank() ? fallback : preferred;
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeObjectType(String targetType) {
        if (targetType == null || targetType.isBlank()) {
            throw new BusinessException("TRACKING_OBJECT_TYPE_REQUIRED", "请选择业务对象类型");
        }
        String normalized = targetType.trim().toLowerCase(Locale.ROOT);
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

    private BusinessException notFound() {
        return new BusinessException("TRACKING_OBJECT_NOT_FOUND", "追踪对象不存在或当前不可见");
    }

    private <T> List<T> limit(List<T> records) {
        return records.size() <= SEGMENT_LIMIT
                ? List.copyOf(records)
                : List.copyOf(records.subList(0, SEGMENT_LIMIT));
    }

    private record Segment<T>(List<T> records, boolean truncated) {
    }

    private record TraceSubject(
            String businessType,
            Long businessId,
            TrackingObjectResponse businessSummary,
            ReviewTaskEntity selectedTask,
            RevisionEntity selectedRevision,
            boolean brokenReference
    ) {
    }
}
