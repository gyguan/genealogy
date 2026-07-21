package com.genealogy.culture.domain;

import com.genealogy.common.domain.DraftDeletePolicy;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.dto.CultureItemCreateRequest;
import com.genealogy.culture.dto.CultureItemSearchCriteria;
import com.genealogy.culture.dto.CultureItemUpdateRequest;
import com.genealogy.culture.entity.CultureItemEntity;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;

@Service
public class CultureItemDomainService {

    public static final String STATUS_DRAFT = CultureDataStatus.DRAFT.value();
    public static final String STATUS_REJECTED = CultureDataStatus.REJECTED.value();
    public static final String STATUS_PENDING_REVIEW = CultureDataStatus.PENDING_REVIEW.value();
    public static final String STATUS_OFFICIAL = CultureDataStatus.OFFICIAL.value();
    public static final String STATUS_ARCHIVED = CultureDataStatus.ARCHIVED.value();
    public static final int MAX_PAGE_SIZE = 100;
    public static final int MAX_CONTENT_LENGTH = 200000;

    private static final Set<String> MUTABLE_STATUSES = Set.of(STATUS_DRAFT, STATUS_REJECTED);
    private static final Set<String> SORT_FIELDS = Set.of(
            "id", "title", "category", "dataStatus", "privacyLevel", "sortOrder", "createdAt", "updatedAt"
    );

    public NormalizedCultureItemInput normalize(CultureItemCreateRequest request) {
        if (request == null) {
            throw new BusinessException("CULTURE_ITEM_REQUEST_REQUIRED", "文化资料请求不能为空");
        }
        return new NormalizedCultureItemInput(
                request.branchId(),
                normalizeCategory(request.category()),
                requiredText(request.title(), 200, "CULTURE_ITEM_TITLE_INVALID", "文化资料标题不能为空且不能超过 200 字"),
                optionalText(request.summary(), 1000, "CULTURE_ITEM_SUMMARY_TOO_LONG", "文化资料摘要不能超过 1000 字"),
                optionalText(request.content(), MAX_CONTENT_LENGTH, "CULTURE_ITEM_CONTENT_TOO_LONG", "文化资料正文不能超过 200000 字"),
                optionalText(request.historicalPeriod(), 200, "CULTURE_ITEM_PERIOD_TOO_LONG", "历史时期不能超过 200 字"),
                optionalText(request.locationText(), 500, "CULTURE_ITEM_LOCATION_TOO_LONG", "地点不能超过 500 字"),
                normalizeConfidence(request.confidenceLevel()),
                normalizePrivacy(request.privacyLevel()),
                normalizeSensitive(request.sensitiveLevel()),
                Boolean.TRUE.equals(request.featuredOnHome()),
                normalizeSortOrder(request.sortOrder())
        );
    }

    public NormalizedCultureItemInput normalize(CultureItemUpdateRequest request) {
        if (request == null) {
            throw new BusinessException("CULTURE_ITEM_REQUEST_REQUIRED", "文化资料请求不能为空");
        }
        return new NormalizedCultureItemInput(
                request.branchId(),
                normalizeCategory(request.category()),
                requiredText(request.title(), 200, "CULTURE_ITEM_TITLE_INVALID", "文化资料标题不能为空且不能超过 200 字"),
                optionalText(request.summary(), 1000, "CULTURE_ITEM_SUMMARY_TOO_LONG", "文化资料摘要不能超过 1000 字"),
                optionalText(request.content(), MAX_CONTENT_LENGTH, "CULTURE_ITEM_CONTENT_TOO_LONG", "文化资料正文不能超过 200000 字"),
                optionalText(request.historicalPeriod(), 200, "CULTURE_ITEM_PERIOD_TOO_LONG", "历史时期不能超过 200 字"),
                optionalText(request.locationText(), 500, "CULTURE_ITEM_LOCATION_TOO_LONG", "地点不能超过 500 字"),
                normalizeConfidence(request.confidenceLevel()),
                normalizePrivacy(request.privacyLevel()),
                normalizeSensitive(request.sensitiveLevel()),
                Boolean.TRUE.equals(request.featuredOnHome()),
                normalizeSortOrder(request.sortOrder())
        );
    }

    public CultureItemSearchCriteria normalize(CultureItemSearchCriteria criteria) {
        CultureItemSearchCriteria safe = criteria == null
                ? CultureItemSearchCriteria.multi(null, List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), null)
                : criteria;
        return CultureItemSearchCriteria.multi(
                optionalText(safe.keyword(), 100, "CULTURE_ITEM_KEYWORD_TOO_LONG", "搜索关键词不能超过 100 字"),
                normalizeValues(safe.categories(), this::normalizeCategory),
                normalizeValues(safe.branchIds(), this::normalizeBranchId),
                normalizeValues(safe.dataStatuses(), this::normalizeStatus),
                normalizeValues(safe.privacyLevels(), this::normalizePrivacy),
                normalizeValues(safe.hasSourceValues(), value -> value),
                normalizeValues(safe.featuredOnHomeValues(), value -> value),
                normalizeSort(safe.sort())
        );
    }

    public void apply(CultureItemEntity entity, NormalizedCultureItemInput input) {
        entity.setBranchId(input.branchId());
        entity.setCategory(input.category());
        entity.setTitle(input.title());
        entity.setSummary(input.summary());
        entity.setContent(input.content());
        entity.setHistoricalPeriod(input.historicalPeriod());
        entity.setLocationText(input.locationText());
        entity.setConfidenceLevel(input.confidenceLevel());
        entity.setPrivacyLevel(input.privacyLevel());
        entity.setSensitiveLevel(input.sensitiveLevel());
        entity.setFeaturedOnHome(input.featuredOnHome());
        entity.setSortOrder(input.sortOrder());
    }

    public void requireDirectlyMutable(CultureItemEntity entity) {
        String status = normalizeStatus(entity.getDataStatus());
        if (MUTABLE_STATUSES.contains(status)) {
            return;
        }
        if (STATUS_PENDING_REVIEW.equals(status)) {
            throw new BusinessException("CULTURE_ITEM_PENDING_REVIEW", "文化资料正在审核中，不能直接修改");
        }
        throw new BusinessException("CULTURE_ITEM_REVIEW_REQUIRED", "正式或归档文化资料不能直接修改，需提交审核变更");
    }

    public void requireDirectlyDeletable(CultureItemEntity entity) {
        DraftDeletePolicy.requireDraft(
                entity == null ? null : entity.getDataStatus(),
                "CULTURE_ITEM_DELETE_DRAFT_ONLY",
                "仅草稿文化资料可直接删除"
        );
    }

    public void requireExpectedVersion(CultureItemEntity entity, Long expectedVersion) {
        if (expectedVersion == null || entity.getVersion() == null || !entity.getVersion().equals(expectedVersion)) {
            throw new BusinessException("CULTURE_ITEM_VERSION_CONFLICT", "文化资料版本已变化，请刷新后重试");
        }
    }

    public boolean isDirectlyMutable(CultureItemEntity entity) {
        return entity != null && MUTABLE_STATUSES.contains(normalizeStatus(entity.getDataStatus()));
    }

    public boolean isDirectlyDeletable(CultureItemEntity entity) {
        return entity != null && DraftDeletePolicy.isDraft(entity.getDataStatus());
    }

    public String normalizeStatus(String value) {
        try {
            return CultureDataStatus.fromValue(normalizeEnum(value)).value();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("CULTURE_ITEM_STATUS_INVALID", "文化资料状态不合法");
        }
    }

    public String sortField(String sort) {
        String normalized = normalizeSort(sort);
        return normalized == null ? "updatedAt" : normalized.split(",", 2)[0];
    }

    public boolean sortAscending(String sort) {
        String normalized = normalizeSort(sort);
        return normalized != null && normalized.endsWith(",asc");
    }

    private String normalizeCategory(String value) {
        try {
            return CultureCategory.fromValue(normalizeEnum(value)).value();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("CULTURE_ITEM_CATEGORY_INVALID", "文化资料分类不合法");
        }
    }

    private String normalizeConfidence(String value) {
        try {
            return CultureConfidenceLevel.fromValue(normalizeEnum(value)).value();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("CULTURE_ITEM_CONFIDENCE_INVALID", "文化资料可信度不合法");
        }
    }

    private String normalizePrivacy(String value) {
        try {
            return CulturePrivacyLevel.fromValue(normalizeEnum(value)).value();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("CULTURE_ITEM_PRIVACY_INVALID", "文化资料隐私级别不合法");
        }
    }

    private String normalizeSensitive(String value) {
        try {
            return CultureSensitiveLevel.fromValue(normalizeEnum(value)).value();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("CULTURE_ITEM_SENSITIVE_INVALID", "文化资料敏感级别不合法");
        }
    }

    private String normalizeSort(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String[] parts = value.trim().split(",", 2);
        String field = SORT_FIELDS.contains(parts[0]) ? parts[0] : "updatedAt";
        String direction = parts.length > 1 && "asc".equalsIgnoreCase(parts[1]) ? "asc" : "desc";
        return field + "," + direction;
    }

    private int normalizeSortOrder(Integer sortOrder) {
        if (sortOrder == null) {
            return 0;
        }
        if (sortOrder < 0) {
            throw new BusinessException("CULTURE_ITEM_SORT_ORDER_INVALID", "排序值不能小于 0");
        }
        return sortOrder;
    }

    private String requiredText(String value, int maxLength, String code, String message) {
        String normalized = optionalText(value, maxLength, code, message);
        if (normalized == null) {
            throw new BusinessException(code, message);
        }
        return normalized;
    }

    private String optionalText(String value, int maxLength, String code, String message) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw new BusinessException(code, message);
        }
        return normalized;
    }

    private Long normalizeBranchId(Long value) {
        if (value == null || value <= 0) {
            throw new BusinessException("CULTURE_ITEM_BRANCH_INVALID", "文化资料支派不合法");
        }
        return value;
    }

    private <T, R> List<R> normalizeValues(List<T> values, Function<T, R> normalizer) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        return values.stream()
                .filter(Objects::nonNull)
                .map(normalizer)
                .distinct()
                .toList();
    }

    private String normalizeEnum(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String optionalEnum(String value, java.util.function.Function<String, String> normalizer) {
        return value == null || value.isBlank() ? null : normalizer.apply(value);
    }

    public record NormalizedCultureItemInput(
            Long branchId,
            String category,
            String title,
            String summary,
            String content,
            String historicalPeriod,
            String locationText,
            String confidenceLevel,
            String privacyLevel,
            String sensitiveLevel,
            boolean featuredOnHome,
            int sortOrder
    ) {
    }
}
