package com.genealogy.review.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.dto.ReviewTargetSummaryResponse;
import com.genealogy.review.dto.ReviewTaskListItemResponse;
import com.genealogy.review.dto.ReviewTaskViewDetailResponse;
import com.genealogy.review.repository.ReviewTaskQueryCriteria;
import com.genealogy.review.repository.ReviewTaskQueryRepository;
import com.genealogy.review.repository.ReviewTaskQueryRepository.ReviewTaskPair;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ReviewTaskQueryApplicationService {

    private static final String REVIEW_VIEW = "review_task:view";
    private static final String VIEW_PENDING = "pending";
    private static final String VIEW_SUBMITTED = "submitted";
    private static final String VIEW_PROCESSED = "processed";
    private static final String SCOPE_MINE = "mine";
    private static final String SCOPE_ALL = "all";
    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_HISTORY = 100;
    private static final Pattern REVIEW_ROUND_PATTERN = Pattern.compile("第\\s*(\\d+)\\s*轮审核");

    private final ReviewTaskQueryRepository reviewTaskQueryRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final RbacAuthorizationApplicationService rbacAuthorizationApplicationService;
    private final AppUserRepository appUserRepository;
    private final BranchRepository branchRepository;
    private final ImportJobRepository importJobRepository;
    private final ImportJobRowRepository importJobRowRepository;
    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final SourceRepository sourceRepository;
    private final GenSchemeRepository genSchemeRepository;

    public ReviewTaskQueryApplicationService(
            ReviewTaskQueryRepository reviewTaskQueryRepository,
            AuthorizationApplicationService authorizationApplicationService,
            RbacAuthorizationApplicationService rbacAuthorizationApplicationService,
            AppUserRepository appUserRepository,
            BranchRepository branchRepository,
            ImportJobRepository importJobRepository,
            ImportJobRowRepository importJobRowRepository,
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            SourceRepository sourceRepository,
            GenSchemeRepository genSchemeRepository
    ) {
        this.reviewTaskQueryRepository = reviewTaskQueryRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.rbacAuthorizationApplicationService = rbacAuthorizationApplicationService;
        this.appUserRepository = appUserRepository;
        this.branchRepository = branchRepository;
        this.importJobRepository = importJobRepository;
        this.importJobRowRepository = importJobRowRepository;
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.sourceRepository = sourceRepository;
        this.genSchemeRepository = genSchemeRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<ReviewTaskListItemResponse> search(
            Long clanId,
            String view,
            String scope,
            String targetType,
            Long targetId,
            String status,
            Long branchId,
            LocalDateTime submittedFrom,
            LocalDateTime submittedTo,
            LocalDateTime processedFrom,
            LocalDateTime processedTo,
            int pageNo,
            int pageSize,
            Long actorId
    ) {
        String normalizedView = normalizeView(view);
        String normalizedScope = normalizeScope(scope);
        validateTimeRange(submittedFrom, submittedTo, "提交时间");
        validateTimeRange(processedFrom, processedTo, "处理时间");
        authorizationApplicationService.requireClanMember(clanId, actorId);

        boolean needsReviewScope = VIEW_PENDING.equals(normalizedView)
                || VIEW_PROCESSED.equals(normalizedView)
                || SCOPE_ALL.equals(normalizedScope);
        RbacAuthorizationApplicationService.PermissionDataScope dataScope = needsReviewScope
                ? reviewDataScope(clanId, actorId)
                : RbacAuthorizationApplicationService.PermissionDataScope.full();
        boolean enforceBranchScope = needsReviewScope;
        validateBranchFilter(clanId, branchId, enforceBranchScope, dataScope);

        ReviewTaskQueryCriteria criteria = new ReviewTaskQueryCriteria(
                clanId,
                actorId,
                normalizedView,
                normalizedScope,
                normalizeNullable(targetType),
                targetId,
                normalizeNullable(status),
                branchId,
                submittedFrom,
                submittedTo,
                processedFrom,
                processedTo,
                enforceBranchScope,
                dataScope.fullClanAccess(),
                dataScope.visibleBranchIds()
        );
        int normalizedPageNo = Math.max(1, pageNo);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, MAX_PAGE_SIZE));
        ReviewTaskQueryRepository.QueryPage page = reviewTaskQueryRepository.search(
                criteria,
                normalizedPageNo,
                normalizedPageSize
        );
        return PageResponse.of(
                enrich(page.records()),
                page.total(),
                normalizedPageNo,
                normalizedPageSize
        );
    }

    @Transactional(readOnly = true)
    public ReviewTaskViewDetailResponse detail(Long clanId, Long taskId, Long actorId) {
        ReviewTaskPair selected = reviewTaskQueryRepository.findByTaskId(taskId)
                .orElseThrow(() -> new BusinessException("REVIEW_TASK_NOT_FOUND", "审核任务不存在"));
        if (!Objects.equals(selected.task().getClanId(), clanId)
                || !Objects.equals(selected.record().getClanId(), clanId)) {
            throw new BusinessException("REVIEW_TASK_NOT_FOUND", "审核任务不存在");
        }
        authorizeTask(selected, actorId);
        List<ReviewTaskPair> historyPairs = reviewTaskQueryRepository.findHistory(
                clanId,
                normalize(selected.record().getTargetType()),
                selected.record().getTargetId(),
                MAX_HISTORY
        );
        List<ReviewTaskListItemResponse> history = enrich(historyPairs);
        ReviewTaskListItemResponse task = history.stream()
                .filter(item -> Objects.equals(item.id(), taskId))
                .findFirst()
                .orElseGet(() -> enrich(List.of(selected)).getFirst());
        return new ReviewTaskViewDetailResponse(task, history);
    }

    @Transactional(readOnly = true)
    public List<ReviewTaskListItemResponse> history(
            Long clanId,
            String targetType,
            Long targetId,
            Long actorId
    ) {
        authorizationApplicationService.requireClanMember(clanId, actorId);
        List<ReviewTaskPair> pairs = reviewTaskQueryRepository.findHistory(
                clanId,
                requireTargetType(targetType),
                targetId,
                MAX_HISTORY
        );
        if (pairs.isEmpty()) {
            return List.of();
        }
        authorizeTask(pairs.getFirst(), actorId);
        return enrich(pairs);
    }

    private void authorizeTask(ReviewTaskPair pair, Long actorId) {
        Long clanId = pair.task().getClanId();
        authorizationApplicationService.requireClanMember(clanId, actorId);
        if (Objects.equals(pair.record().getSubmitterId(), actorId)) {
            return;
        }
        RbacAuthorizationApplicationService.PermissionDataScope scope = reviewDataScope(clanId, actorId);
        requireScopeAccess(scope, pair.task().getBranchId());
    }

    private RbacAuthorizationApplicationService.PermissionDataScope reviewDataScope(Long clanId, Long actorId) {
        authorizationApplicationService.requirePermission(clanId, actorId, REVIEW_VIEW);
        if (authorizationApplicationService.isCrossClanAdmin(actorId)) {
            return RbacAuthorizationApplicationService.PermissionDataScope.full();
        }
        return rbacAuthorizationApplicationService.permissionDataScope(actorId, clanId, REVIEW_VIEW);
    }

    private void validateBranchFilter(
            Long clanId,
            Long branchId,
            boolean enforceBranchScope,
            RbacAuthorizationApplicationService.PermissionDataScope scope
    ) {
        if (branchId == null) {
            return;
        }
        branchRepository.findByIdAndClanId(branchId, clanId)
                .orElseThrow(() -> new BusinessException("BRANCH_NOT_FOUND", "支派不存在"));
        if (enforceBranchScope) {
            requireScopeAccess(scope, branchId);
        }
    }

    private void requireScopeAccess(
            RbacAuthorizationApplicationService.PermissionDataScope scope,
            Long branchId
    ) {
        boolean allowed = branchId == null ? scope.fullClanAccess() : scope.canAccessBranch(branchId);
        if (!allowed) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限查看该审核任务");
        }
    }

    private List<ReviewTaskListItemResponse> enrich(List<ReviewTaskPair> pairs) {
        if (pairs.isEmpty()) {
            return List.of();
        }
        Set<Long> userIds = new LinkedHashSet<>();
        Set<Long> branchIds = new LinkedHashSet<>();
        Map<String, Set<Long>> targetIds = new LinkedHashMap<>();
        for (ReviewTaskPair pair : pairs) {
            add(userIds, pair.record().getSubmitterId());
            add(userIds, pair.task().getReviewerId());
            add(branchIds, pair.task().getBranchId());
            String targetType = normalize(pair.record().getTargetType());
            if (pair.record().getTargetId() != null) {
                targetIds.computeIfAbsent(targetType, ignored -> new LinkedHashSet<>())
                        .add(pair.record().getTargetId());
            }
        }

        Map<Long, AppUserEntity> users = index(appUserRepository.findAllById(userIds), AppUserEntity::getId);
        Map<Long, BranchEntity> branches = index(branchRepository.findAllById(branchIds), BranchEntity::getId);
        Map<Long, ImportJobEntity> importJobs = index(
                importJobRepository.findAllById(ids(targetIds, "import_job")),
                ImportJobEntity::getId
        );
        Map<Long, PersonEntity> persons = index(
                personRepository.findAllById(ids(targetIds, "person")),
                PersonEntity::getId
        );
        Map<Long, RelationshipEntity> relationships = index(
                relationshipRepository.findAllById(ids(targetIds, "relationship")),
                RelationshipEntity::getId
        );
        Map<Long, SourceEntity> sources = index(
                sourceRepository.findAllById(ids(targetIds, "source")),
                SourceEntity::getId
        );
        Map<Long, GenerationSchemeEntity> schemes = index(
                genSchemeRepository.findAllById(ids(targetIds, "generation_scheme")),
                GenerationSchemeEntity::getId
        );
        Map<Long, Integer> excludedCounts = excludedCounts(importJobs.keySet());

        List<ReviewTaskListItemResponse> result = new ArrayList<>(pairs.size());
        for (ReviewTaskPair pair : pairs) {
            String targetType = normalize(pair.record().getTargetType());
            Long targetId = pair.record().getTargetId();
            BranchEntity branch = branches.get(pair.task().getBranchId());
            String branchName = branch == null ? null : safe(branch.getBranchName());
            TargetPresentation presentation = presentation(
                    targetType,
                    targetId,
                    branchName,
                    pair.record().getDiffSummary(),
                    importJobs,
                    persons,
                    relationships,
                    sources,
                    schemes,
                    excludedCounts
            );
            result.add(new ReviewTaskListItemResponse(
                    pair.task().getId(),
                    pair.task().getClanId(),
                    pair.task().getRevisionId(),
                    pair.task().getBranchId(),
                    branchName,
                    pair.task().getStatus(),
                    targetType,
                    targetId,
                    presentation.title(),
                    pair.record().getDiffSummary(),
                    pair.record().getSubmitterId(),
                    userName(users.get(pair.record().getSubmitterId()), pair.record().getSubmitterId()),
                    pair.task().getReviewerId(),
                    userName(users.get(pair.task().getReviewerId()), pair.task().getReviewerId()),
                    firstNonBlank(pair.task().getReviewComment(), pair.record().getRejectedReason()),
                    pair.record().getSubmitTime(),
                    firstNonNull(pair.task().getReviewedAt(), pair.record().getApprovedAt()),
                    presentation.summary()
            ));
        }
        return List.copyOf(result);
    }

    private TargetPresentation presentation(
            String targetType,
            Long targetId,
            String branchName,
            String diffSummary,
            Map<Long, ImportJobEntity> importJobs,
            Map<Long, PersonEntity> persons,
            Map<Long, RelationshipEntity> relationships,
            Map<Long, SourceEntity> sources,
            Map<Long, GenerationSchemeEntity> schemes,
            Map<Long, Integer> excludedCounts
    ) {
        if ("import_job".equals(targetType)) {
            ImportJobEntity job = importJobs.get(targetId);
            String fileName = job == null ? null : safe(job.getOriginalFilename());
            String title = fileName == null ? "导入批次审核" : "导入批次 · " + fileName;
            Integer reviewRound = parseReviewRound(diffSummary);
            if (reviewRound == null && job != null) {
                reviewRound = job.getReviewRound();
            }
            return new TargetPresentation(
                    title,
                    new ReviewTargetSummaryResponse(
                            title,
                            fileName,
                            branchName,
                            job == null ? null : value(job.getSuccessCount()),
                            excludedCounts.getOrDefault(targetId, 0),
                            reviewRound
                    )
            );
        }
        if ("person".equals(targetType)) {
            PersonEntity person = persons.get(targetId);
            return simple("人物", person == null ? null : safe(person.getName()), branchName);
        }
        if ("relationship".equals(targetType)) {
            RelationshipEntity relationship = relationships.get(targetId);
            return simple("人物关系", relationship == null ? null : safe(relationship.getRelationType()), branchName);
        }
        if ("source".equals(targetType)) {
            SourceEntity source = sources.get(targetId);
            return simple("来源资料", source == null ? null : safe(source.getSourceName()), branchName);
        }
        if ("branch".equals(targetType)) {
            return simple("支派", branchName, branchName);
        }
        if ("generation_scheme".equals(targetType)) {
            GenerationSchemeEntity scheme = schemes.get(targetId);
            return simple("字辈方案", scheme == null ? null : safe(scheme.getSchemeName()), branchName);
        }
        String typeTitle = targetTypeTitle(targetType);
        String title = targetId == null ? typeTitle + "审核" : typeTitle + " · #" + targetId;
        return new TargetPresentation(
                title,
                new ReviewTargetSummaryResponse(title, null, branchName, null, null, null)
        );
    }

    private TargetPresentation simple(String typeTitle, String name, String branchName) {
        String title = name == null ? typeTitle + "审核" : typeTitle + " · " + name;
        return new TargetPresentation(
                title,
                new ReviewTargetSummaryResponse(title, null, branchName, null, null, null)
        );
    }

    private Map<Long, Integer> excludedCounts(Collection<Long> jobIds) {
        if (jobIds == null || jobIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Integer> result = new HashMap<>();
        for (Object[] row : importJobRowRepository.countByJobIdsAndRowStatus(
                jobIds,
                ImportJobRowEntity.STATUS_EXCLUDED
        )) {
            if (row.length >= 2 && row[0] instanceof Number jobId && row[1] instanceof Number count) {
                result.put(jobId.longValue(), safeInt(count.longValue()));
            }
        }
        return result;
    }

    private String normalizeView(String value) {
        String normalized = normalize(value);
        if (normalized.isBlank()) {
            return VIEW_PENDING;
        }
        if (!Set.of(VIEW_PENDING, VIEW_SUBMITTED, VIEW_PROCESSED).contains(normalized)) {
            throw new BusinessException("REVIEW_VIEW_INVALID", "审核视图不合法");
        }
        return normalized;
    }

    private String normalizeScope(String value) {
        String normalized = normalize(value);
        if (normalized.isBlank()) {
            return SCOPE_MINE;
        }
        if (!Set.of(SCOPE_MINE, SCOPE_ALL).contains(normalized)) {
            throw new BusinessException("REVIEW_SCOPE_INVALID", "审核查询范围不合法");
        }
        return normalized;
    }

    private String requireTargetType(String value) {
        String normalized = normalize(value);
        if (normalized.isBlank()) {
            throw new BusinessException("REVIEW_TARGET_TYPE_REQUIRED", "审核对象类型不能为空");
        }
        return normalized;
    }

    private void validateTimeRange(LocalDateTime from, LocalDateTime to, String label) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new BusinessException("REVIEW_TIME_RANGE_INVALID", label + "范围不合法");
        }
    }

    private Integer parseReviewRound(String summary) {
        if (summary == null || summary.isBlank()) {
            return null;
        }
        Matcher matcher = REVIEW_ROUND_PATTERN.matcher(summary);
        if (!matcher.find()) {
            return null;
        }
        try {
            return Integer.parseInt(matcher.group(1));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String targetTypeTitle(String targetType) {
        return switch (targetType) {
            case "source_binding" -> "来源绑定";
            case "clan" -> "宗族";
            default -> "业务变更";
        };
    }

    private String userName(AppUserEntity user, Long userId) {
        if (user != null && user.getDisplayName() != null && !user.getDisplayName().isBlank()) {
            return user.getDisplayName().trim();
        }
        return userId == null ? null : "用户#" + userId;
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) return first.trim();
        if (second != null && !second.isBlank()) return second.trim();
        return null;
    }

    private LocalDateTime firstNonNull(LocalDateTime first, LocalDateTime second) {
        return first != null ? first : second;
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replace('-', '_');
    }

    private String normalizeNullable(String value) {
        String normalized = normalize(value);
        return normalized.isBlank() ? null : normalized;
    }

    private int value(Integer value) {
        return value == null ? 0 : value;
    }

    private int safeInt(long value) {
        return value > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) value;
    }

    private void add(Set<Long> values, Long value) {
        if (value != null) values.add(value);
    }

    private Set<Long> ids(Map<String, Set<Long>> targetIds, String type) {
        return targetIds.getOrDefault(type, Set.of());
    }

    private <T> Map<Long, T> index(Iterable<T> values, Function<T, Long> idExtractor) {
        Map<Long, T> result = new LinkedHashMap<>();
        if (values == null) return result;
        for (T value : values) {
            if (value != null) result.put(idExtractor.apply(value), value);
        }
        return result;
    }

    private record TargetPresentation(String title, ReviewTargetSummaryResponse summary) {
    }
}
