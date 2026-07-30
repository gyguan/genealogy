package com.genealogy.home.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.home.dto.HomeDashboardActivityResponse;
import com.genealogy.home.dto.HomeDashboardBranchCoverageResponse;
import com.genealogy.home.dto.HomeDashboardBucketResponse;
import com.genealogy.home.dto.HomeDashboardCompletenessResponse;
import com.genealogy.home.dto.HomeDashboardResponse;
import com.genealogy.home.dto.HomeDashboardRiskResponse;
import com.genealogy.home.dto.HomeDashboardTrendPointResponse;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.person.repository.query.PersonDashboardBucket;
import com.genealogy.person.repository.query.PersonDashboardDailyCount;
import com.genealogy.person.repository.query.PersonDashboardData;
import com.genealogy.person.repository.query.PersonDashboardSummary;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class HomeDashboardApplicationService {

    private static final String PERSON_VIEW = "person:view";
    private static final String OFFICIAL_STATUS = "official";
    private static final Set<String> PENDING_REVIEW_STATUSES = Set.of("pending", "pending_review");
    private static final Set<String> COMPLETED_REVIEW_STATUSES = Set.of("approved", "rejected");
    private static final Map<String, String> GENDER_LABELS = Map.of("male", "男", "female", "女", "unknown", "未知");
    private static final Map<String, String> SOURCE_TYPE_LABELS = Map.of(
            "genealogy_book", "族谱原文",
            "oral_record", "口述记录",
            "tombstone", "墓碑墓志",
            "photo", "照片",
            "local_chronicle", "地方志",
            "other", "其他"
    );

    private final PersonRepository personRepository;
    private final BranchRepository branchRepository;
    private final SourceRepository sourceRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final AuthorizationApplicationService authorizationApplicationService;

    public HomeDashboardApplicationService(
            PersonRepository personRepository,
            BranchRepository branchRepository,
            SourceRepository sourceRepository,
            ReviewTaskRepository reviewTaskRepository,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.personRepository = personRepository;
        this.branchRepository = branchRepository;
        this.sourceRepository = sourceRepository;
        this.reviewTaskRepository = reviewTaskRepository;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @Transactional(readOnly = true)
    public HomeDashboardResponse getDashboard(Long clanId, Long actorId) {
        authorizationApplicationService.requirePermission(clanId, actorId, PERSON_VIEW);

        LocalDateTime asOf = LocalDateTime.now();
        PersonDashboardData personData = personRepository.loadDashboardData(
                clanId,
                OFFICIAL_STATUS,
                asOf.toLocalDate().minusDays(29).atStartOfDay(),
                4
        );
        PersonDashboardSummary summary = personData.summary();
        long peopleTotal = summary.peopleTotal();
        long branchCount = branchRepository.countByClanId(clanId);
        long sourceCount = sourceRepository.countByClanId(clanId);
        long pendingReviewCount = reviewTaskRepository.countByClanIdAndStatusIn(clanId, PENDING_REVIEW_STATUSES);
        long overdueReviewCount = reviewTaskRepository.countByClanIdAndStatusInAndCreatedAtBefore(
                clanId,
                PENDING_REVIEW_STATUSES,
                asOf.minusDays(7)
        );

        List<BranchEntity> branches = branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(clanId);
        List<SourceEntity> recentSources = sourceRepository.findRecentDashboardSources(clanId, PageRequest.of(0, 1000));
        List<ReviewTaskEntity> recentReviewTasks = reviewTaskRepository.findRecentDashboardTasks(clanId, PageRequest.of(0, 1000));

        return new HomeDashboardResponse(
                clanId,
                asOf,
                peopleTotal,
                branchCount,
                sourceCount,
                pendingReviewCount,
                normalizeGenderBuckets(buckets(personData, "gender")),
                normalizeLivingBuckets(buckets(personData, "living")),
                normalizeGenerationBuckets(buckets(personData, "generation")),
                normalizeBranchBuckets(branches, buckets(personData, "branch")),
                normalizeSourceTypeBuckets(sourceRepository.countDashboardBySourceType(clanId)),
                new HomeDashboardCompletenessResponse(
                        summary.generationMaintained(),
                        rate(summary.generationMaintained(), peopleTotal),
                        summary.vitalDatesMaintained(),
                        rate(summary.vitalDatesMaintained(), peopleTotal),
                        summary.biographyMaintained(),
                        rate(summary.biographyMaintained(), peopleTotal)
                ),
                new HomeDashboardBranchCoverageResponse(
                        summary.coveredBranches(),
                        branchCount,
                        rate(summary.coveredBranches(), branchCount)
                ),
                buildTrendPoints(asOf.toLocalDate(), personData.createdDaily(), recentSources, recentReviewTasks),
                buildRisks(
                        pendingReviewCount,
                        overdueReviewCount,
                        summary.keyInfoMissing(),
                        Math.max(0, branchCount - summary.coveredBranches()),
                        peopleTotal,
                        sourceCount
                ),
                buildRecentActivities(personData.recentPeople(), recentSources, recentReviewTasks)
        );
    }

    private List<PersonDashboardBucket> buckets(PersonDashboardData data, String dimension) {
        return data.buckets().stream().filter(item -> dimension.equals(item.dimension())).toList();
    }

    private List<HomeDashboardBucketResponse> normalizeGenderBuckets(List<PersonDashboardBucket> rows) {
        List<HomeDashboardBucketResponse> buckets = new ArrayList<>();
        Set<String> seen = new java.util.HashSet<>();
        for (PersonDashboardBucket row : rows) {
            String key = normalizeString(row.key(), "unknown");
            seen.add(key);
            buckets.add(new HomeDashboardBucketResponse(key, GENDER_LABELS.getOrDefault(key, key), row.count()));
        }
        for (String key : List.of("male", "female", "unknown")) {
            if (!seen.contains(key)) buckets.add(new HomeDashboardBucketResponse(key, GENDER_LABELS.getOrDefault(key, key), 0));
        }
        buckets.sort(Comparator.comparingInt(item -> switch (item.key()) {
            case "male" -> 0;
            case "female" -> 1;
            case "unknown" -> 2;
            default -> 3;
        }));
        return buckets;
    }

    private List<HomeDashboardBucketResponse> normalizeLivingBuckets(List<PersonDashboardBucket> rows) {
        Map<String, Long> counts = rows.stream().collect(Collectors.toMap(
                row -> normalizeString(row.key(), "unknown"),
                PersonDashboardBucket::count,
                Long::sum
        ));
        return List.of(
                new HomeDashboardBucketResponse("living", "在世", counts.getOrDefault("living", 0L)),
                new HomeDashboardBucketResponse("deceased", "已故", counts.getOrDefault("deceased", 0L)),
                new HomeDashboardBucketResponse("unknown", "未维护", counts.getOrDefault("unknown", 0L))
        );
    }

    private List<HomeDashboardBucketResponse> normalizeGenerationBuckets(List<PersonDashboardBucket> rows) {
        List<HomeDashboardBucketResponse> buckets = rows.stream()
                .map(row -> "unmaintained".equals(row.key())
                        ? new HomeDashboardBucketResponse("unmaintained", "未维护", row.count())
                        : new HomeDashboardBucketResponse(row.key(), row.key() + "世", row.count()))
                .collect(Collectors.toCollection(ArrayList::new));
        buckets.sort(Comparator.comparingInt(item -> "unmaintained".equals(item.key())
                ? Integer.MAX_VALUE
                : Integer.parseInt(item.key())));
        return buckets;
    }

    private List<HomeDashboardBucketResponse> normalizeBranchBuckets(
            List<BranchEntity> branches,
            List<PersonDashboardBucket> rows
    ) {
        Map<String, Long> counts = new HashMap<>();
        for (PersonDashboardBucket row : rows) counts.put(normalizeString(row.key(), "unmaintained"), row.count());
        List<HomeDashboardBucketResponse> buckets = new ArrayList<>();
        for (BranchEntity branch : branches) {
            buckets.add(new HomeDashboardBucketResponse(
                    String.valueOf(branch.getId()),
                    safeText(branch.getBranchName(), "未命名支派"),
                    counts.getOrDefault(String.valueOf(branch.getId()), 0L)
            ));
        }
        long unmaintained = counts.getOrDefault("unmaintained", 0L);
        if (unmaintained > 0) buckets.add(new HomeDashboardBucketResponse("unmaintained", "未维护支派", unmaintained));
        buckets.sort(Comparator.comparingLong(HomeDashboardBucketResponse::count).reversed());
        return buckets;
    }

    private List<HomeDashboardBucketResponse> normalizeSourceTypeBuckets(List<Object[]> rows) {
        List<HomeDashboardBucketResponse> buckets = rows.stream()
                .map(row -> {
                    String key = normalizeString(row[0], "other");
                    return new HomeDashboardBucketResponse(key, SOURCE_TYPE_LABELS.getOrDefault(key, key), count(row[1]));
                })
                .sorted(Comparator.comparingLong(HomeDashboardBucketResponse::count).reversed())
                .collect(Collectors.toCollection(ArrayList::new));
        if (buckets.isEmpty()) buckets.add(new HomeDashboardBucketResponse("none", "暂无来源", 0));
        return buckets;
    }

    private List<HomeDashboardTrendPointResponse> buildTrendPoints(
            LocalDate today,
            List<PersonDashboardDailyCount> peopleDaily,
            List<SourceEntity> sources,
            List<ReviewTaskEntity> tasks
    ) {
        Map<LocalDate, long[]> points = new LinkedHashMap<>();
        for (int index = 29; index >= 0; index--) points.put(today.minusDays(index), new long[]{0, 0, 0});
        for (PersonDashboardDailyCount daily : peopleDaily) {
            long[] values = points.get(daily.day());
            if (values != null) values[0] += daily.count();
        }
        for (SourceEntity source : sources) increment(points, source.getCreatedAt(), 1);
        for (ReviewTaskEntity task : tasks) {
            if (COMPLETED_REVIEW_STATUSES.contains(normalizeString(task.getStatus(), ""))) increment(points, task.getReviewedAt(), 2);
        }
        return points.entrySet().stream()
                .map(entry -> new HomeDashboardTrendPointResponse(entry.getKey(), entry.getValue()[0], entry.getValue()[1], entry.getValue()[2]))
                .toList();
    }

    private void increment(Map<LocalDate, long[]> points, LocalDateTime time, int index) {
        if (time == null) return;
        long[] values = points.get(time.toLocalDate());
        if (values != null) values[index] += 1;
    }

    private List<HomeDashboardRiskResponse> buildRisks(long pending, long overdue, long keyMissing, long emptyBranches, long peopleTotal, long sourceCount) {
        long sourceGap = Math.max(0, peopleTotal - sourceCount);
        List<HomeDashboardRiskResponse> risks = new ArrayList<>();
        risks.add(new HomeDashboardRiskResponse("pending_review", "待审核事项", pending, pending > 0 ? "medium" : "ok", "仍有变更等待审核处理", "reviewCenter", "status=pending"));
        risks.add(new HomeDashboardRiskResponse("overdue_review", "超时待审核", overdue, overdue > 0 ? "high" : "ok", "创建超过 7 天仍未完成审核", "reviewCenter", "overdue=true"));
        risks.add(new HomeDashboardRiskResponse("missing_key_info", "关键信息缺失", keyMissing, keyMissing > 0 ? "medium" : "ok", "字辈或生卒等关键字段尚未维护", "personArchive", "quality=missing_key_info"));
        risks.add(new HomeDashboardRiskResponse("empty_branch", "无族人支派", emptyBranches, emptyBranches > 0 ? "low" : "ok", "支派下暂无正式族人，需要补录或合并", "personArchive", "quality=empty_branch"));
        risks.add(new HomeDashboardRiskResponse("source_coverage_gap", "来源覆盖不足", sourceGap, sourceGap > 0 ? "medium" : "ok", "来源资料数量少于正式族人数量，请补充证据材料", "sourceLibrary", "quality=source_gap"));
        return risks;
    }

    private List<HomeDashboardActivityResponse> buildRecentActivities(List<PersonEntity> people, List<SourceEntity> sources, List<ReviewTaskEntity> tasks) {
        List<HomeDashboardActivityResponse> activities = new ArrayList<>();
        people.stream().limit(4).forEach(person -> activities.add(new HomeDashboardActivityResponse(
                "person", "人物档案更新", safeText(person.getName(), "未命名人物"), "修谱成员",
                safeTime(person.getUpdatedAt(), person.getCreatedAt()), statusLabel(person.getDataStatus()),
                "personArchive", "person=" + person.getId()
        )));
        sources.stream().limit(3).forEach(source -> activities.add(new HomeDashboardActivityResponse(
                "source", "来源资料更新", safeText(source.getSourceName(), "未命名资料"), "修谱成员",
                safeTime(source.getUpdatedAt(), source.getCreatedAt()), statusLabel(source.getVerificationStatus()),
                "sourceLibrary", "source=" + source.getId()
        )));
        tasks.stream().limit(5).forEach(task -> activities.add(new HomeDashboardActivityResponse(
                "review", "审核任务流转", "审核事项", "审核成员",
                safeTime(task.getReviewedAt(), task.getCreatedAt()), statusLabel(task.getStatus()),
                "reviewCenter", "task=" + task.getId()
        )));
        activities.sort(Comparator.comparing(
                HomeDashboardActivityResponse::occurredAt,
                Comparator.nullsLast(Comparator.naturalOrder())
        ).reversed());
        return activities.stream().limit(10).toList();
    }

    private String normalizeString(Object value, String fallback) {
        String text = value == null ? "" : String.valueOf(value).trim().toLowerCase();
        return text.isEmpty() ? fallback : text;
    }

    private String safeText(String value, String fallback) {
        String text = value == null ? "" : value.trim();
        return text.isEmpty() ? fallback : text;
    }

    private LocalDateTime safeTime(LocalDateTime primary, LocalDateTime fallback) {
        return primary != null ? primary : fallback;
    }

    private String statusLabel(String status) {
        return switch (normalizeString(status, "")) {
            case "official", "active", "approved" -> "已完成";
            case "pending", "pending_review" -> "待处理";
            case "rejected" -> "已驳回";
            case "archived" -> "已归档";
            default -> "状态待维护";
        };
    }

    private long count(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }

    private double rate(long numerator, long denominator) {
        if (denominator <= 0) return 0;
        return Math.round((double) numerator * 10000 / denominator) / 100.0;
    }
}
