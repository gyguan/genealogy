package com.genealogy.home.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.home.dto.HomeDashboardBranchCoverageResponse;
import com.genealogy.home.dto.HomeDashboardBucketResponse;
import com.genealogy.home.dto.HomeDashboardCompletenessResponse;
import com.genealogy.home.dto.HomeDashboardResponse;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class HomeDashboardApplicationService {

    private static final String PERSON_VIEW = "person:view";
    private static final String OFFICIAL_STATUS = "official";
    private static final Set<String> PENDING_REVIEW_STATUSES = Set.of("pending", "pending_review");
    private static final Map<String, String> GENDER_LABELS = Map.of(
            "male", "男",
            "female", "女",
            "unknown", "未知"
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

        long peopleTotal = personRepository.countByClanIdAndDeletedAtIsNullAndDataStatus(clanId, OFFICIAL_STATUS);
        long branchCount = branchRepository.countByClanId(clanId);
        long sourceCount = sourceRepository.countByClanId(clanId);
        long pendingReviewCount = reviewTaskRepository.countByClanIdAndStatusIn(clanId, PENDING_REVIEW_STATUSES);
        long generationMaintainedCount = personRepository.countDashboardGenerationMaintained(clanId, OFFICIAL_STATUS);
        long vitalDatesMaintainedCount = personRepository.countDashboardVitalDatesMaintained(clanId, OFFICIAL_STATUS);
        long biographyMaintainedCount = personRepository.countDashboardBiographyMaintained(clanId, OFFICIAL_STATUS);
        long coveredBranchCount = personRepository.countDashboardCoveredBranches(clanId, OFFICIAL_STATUS);

        return new HomeDashboardResponse(
                clanId,
                LocalDateTime.now(),
                peopleTotal,
                branchCount,
                sourceCount,
                pendingReviewCount,
                normalizeGenderBuckets(personRepository.countDashboardByGender(clanId, OFFICIAL_STATUS)),
                normalizeLivingBuckets(personRepository.countDashboardByLivingStatus(clanId, OFFICIAL_STATUS)),
                normalizeGenerationBuckets(personRepository.countDashboardByGenerationNo(clanId, OFFICIAL_STATUS)),
                new HomeDashboardCompletenessResponse(
                        generationMaintainedCount,
                        rate(generationMaintainedCount, peopleTotal),
                        vitalDatesMaintainedCount,
                        rate(vitalDatesMaintainedCount, peopleTotal),
                        biographyMaintainedCount,
                        rate(biographyMaintainedCount, peopleTotal)
                ),
                new HomeDashboardBranchCoverageResponse(
                        coveredBranchCount,
                        branchCount,
                        rate(coveredBranchCount, branchCount)
                )
        );
    }

    private List<HomeDashboardBucketResponse> normalizeGenderBuckets(List<Object[]> rows) {
        List<HomeDashboardBucketResponse> buckets = new ArrayList<>();
        Set<String> seen = new java.util.HashSet<>();
        for (Object[] row : rows) {
            String key = normalizeString(row[0], "unknown");
            seen.add(key);
            buckets.add(new HomeDashboardBucketResponse(key, GENDER_LABELS.getOrDefault(key, key), count(row[1])));
        }
        for (String key : List.of("male", "female", "unknown")) {
            if (!seen.contains(key)) {
                buckets.add(new HomeDashboardBucketResponse(key, GENDER_LABELS.getOrDefault(key, key), 0));
            }
        }
        buckets.sort(Comparator.comparingInt(item -> switch (item.key()) {
            case "male" -> 0;
            case "female" -> 1;
            case "unknown" -> 2;
            default -> 3;
        }));
        return buckets;
    }

    private List<HomeDashboardBucketResponse> normalizeLivingBuckets(List<Object[]> rows) {
        long living = 0;
        long deceased = 0;
        long unknown = 0;
        for (Object[] row : rows) {
            if (Boolean.TRUE.equals(row[0])) {
                living += count(row[1]);
            } else if (Boolean.FALSE.equals(row[0])) {
                deceased += count(row[1]);
            } else {
                unknown += count(row[1]);
            }
        }
        return List.of(
                new HomeDashboardBucketResponse("living", "在世", living),
                new HomeDashboardBucketResponse("deceased", "已故", deceased),
                new HomeDashboardBucketResponse("unknown", "未维护", unknown)
        );
    }

    private List<HomeDashboardBucketResponse> normalizeGenerationBuckets(List<Object[]> rows) {
        List<HomeDashboardBucketResponse> buckets = new ArrayList<>();
        for (Object[] row : rows) {
            Integer generationNo = row[0] instanceof Number number ? number.intValue() : null;
            long value = count(row[1]);
            if (generationNo == null) {
                buckets.add(new HomeDashboardBucketResponse("unmaintained", "未维护", value));
            } else {
                buckets.add(new HomeDashboardBucketResponse(String.valueOf(generationNo), generationNo + "世", value));
            }
        }
        buckets.sort(Comparator.comparingInt(item -> "unmaintained".equals(item.key()) ? Integer.MAX_VALUE : Integer.parseInt(item.key())));
        return buckets;
    }

    private String normalizeString(Object value, String fallback) {
        String text = value == null ? "" : String.valueOf(value).trim().toLowerCase();
        return text.isEmpty() ? fallback : text;
    }

    private long count(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }

    private double rate(long numerator, long denominator) {
        if (denominator <= 0) {
            return 0;
        }
        return Math.round((double) numerator * 10000 / denominator) / 100.0;
    }
}
