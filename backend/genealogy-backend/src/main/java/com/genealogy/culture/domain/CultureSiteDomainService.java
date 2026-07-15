package com.genealogy.culture.domain;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.dto.CultureSiteCreateRequest;
import com.genealogy.culture.dto.CultureSiteSearchCriteria;
import com.genealogy.culture.dto.CultureSiteUpdateRequest;
import com.genealogy.culture.entity.CultureSiteEntity;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;

@Service
public class CultureSiteDomainService {

    public static final int MAX_PAGE_SIZE = 100;
    public static final int MAX_DESCRIPTION_LENGTH = 200000;
    public static final String STATUS_DRAFT = CultureDataStatus.DRAFT.value();
    public static final String STATUS_REJECTED = CultureDataStatus.REJECTED.value();
    public static final String STATUS_PENDING_REVIEW = CultureDataStatus.PENDING_REVIEW.value();
    public static final String STATUS_OFFICIAL = CultureDataStatus.OFFICIAL.value();
    public static final String STATUS_ARCHIVED = CultureDataStatus.ARCHIVED.value();

    private static final Set<String> MUTABLE_STATUSES = Set.of(STATUS_DRAFT, STATUS_REJECTED);
    private static final Set<String> SORT_FIELDS = Set.of(
            "siteName", "siteType", "foundedPeriod", "currentStatus", "sortOrder", "createdAt", "updatedAt", "id"
    );

    public NormalizedSiteInput normalize(CultureSiteCreateRequest request) {
        if (request == null) throw new BusinessException("CULTURE_SITE_REQUEST_REQUIRED", "文化场所请求不能为空");
        return normalizeInput(
                request.branchId(), request.relatedPersonId(), request.siteType(), request.siteName(), request.addressText(),
                request.foundedPeriod(), request.currentStatus(), request.summary(), request.description(), request.latitude(),
                request.longitude(), request.confidenceLevel(), request.privacyLevel(), request.sensitiveLevel(),
                request.featuredOnHome(), request.sortOrder()
        );
    }

    public NormalizedSiteInput normalize(CultureSiteUpdateRequest request) {
        if (request == null) throw new BusinessException("CULTURE_SITE_REQUEST_REQUIRED", "文化场所请求不能为空");
        return normalizeInput(
                request.branchId(), request.relatedPersonId(), request.siteType(), request.siteName(), request.addressText(),
                request.foundedPeriod(), request.currentStatus(), request.summary(), request.description(), request.latitude(),
                request.longitude(), request.confidenceLevel(), request.privacyLevel(), request.sensitiveLevel(),
                request.featuredOnHome(), request.sortOrder()
        );
    }

    public CultureSiteSearchCriteria normalize(CultureSiteSearchCriteria criteria) {
        CultureSiteSearchCriteria safe = criteria == null
                ? new CultureSiteSearchCriteria(null, null, null, null, null, null, null, null, null, null, null)
                : criteria;
        return new CultureSiteSearchCriteria(
                optionalText(safe.keyword(), 100, "CULTURE_SITE_KEYWORD_TOO_LONG", "搜索关键词不能超过 100 字"),
                optionalEnum(safe.siteType(), this::normalizeSiteType),
                safe.branchId(),
                optionalText(safe.addressText(), 500, "CULTURE_SITE_ADDRESS_TOO_LONG", "地址不能超过 500 字"),
                optionalText(safe.foundedPeriod(), 200, "CULTURE_SITE_PERIOD_TOO_LONG", "始建年代不能超过 200 字"),
                optionalText(safe.currentStatus(), 100, "CULTURE_SITE_CURRENT_STATUS_TOO_LONG", "现实状态不能超过 100 字"),
                safe.relatedPersonId(),
                optionalEnum(safe.dataStatus(), this::normalizeStatus),
                optionalEnum(safe.privacyLevel(), this::normalizePrivacy),
                safe.featuredOnHome(),
                normalizeSort(safe.sort())
        );
    }

    public void apply(CultureSiteEntity entity, NormalizedSiteInput input) {
        entity.setBranchId(input.branchId());
        entity.setRelatedPersonId(input.relatedPersonId());
        entity.setSiteType(input.siteType());
        entity.setSiteName(input.siteName());
        entity.setAddressText(input.addressText());
        entity.setFoundedPeriod(input.foundedPeriod());
        entity.setCurrentStatus(input.currentStatus());
        entity.setSummary(input.summary());
        entity.setDescription(input.description());
        entity.setLatitude(input.latitude());
        entity.setLongitude(input.longitude());
        entity.setConfidenceLevel(input.confidenceLevel());
        entity.setPrivacyLevel(input.privacyLevel());
        entity.setSensitiveLevel(input.sensitiveLevel());
        entity.setFeaturedOnHome(input.featuredOnHome());
        entity.setSortOrder(input.sortOrder());
    }

    public void requireDirectlyMutable(CultureSiteEntity entity) {
        String status = normalizeStatus(entity.getDataStatus());
        if (MUTABLE_STATUSES.contains(status)) return;
        if (STATUS_PENDING_REVIEW.equals(status)) {
            throw new BusinessException("CULTURE_SITE_PENDING_REVIEW", "文化场所正在审核中，不能直接修改");
        }
        throw new BusinessException("CULTURE_SITE_REVIEW_REQUIRED", "正式或归档文化场所不能直接修改，需提交审核变更");
    }

    public void requireExpectedVersion(CultureSiteEntity entity, Long expectedVersion) {
        if (expectedVersion == null || entity.getVersion() == null || !entity.getVersion().equals(expectedVersion)) {
            throw new BusinessException("CULTURE_SITE_VERSION_CONFLICT", "文化场所版本已变化，请刷新后重试");
        }
    }

    public String normalizeStatus(String value) {
        try {
            return CultureDataStatus.fromValue(normalizeEnum(value)).value();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("CULTURE_SITE_STATUS_INVALID", "文化场所数据状态不合法");
        }
    }

    public String sortField(String sort) {
        String normalized = normalizeSort(sort);
        return normalized == null ? "sortOrder" : normalized.split(",", 2)[0];
    }

    public boolean sortAscending(String sort) {
        String normalized = normalizeSort(sort);
        return normalized == null || normalized.endsWith(",asc");
    }

    private NormalizedSiteInput normalizeInput(
            Long branchId,
            Long relatedPersonId,
            String siteType,
            String siteName,
            String addressText,
            String foundedPeriod,
            String currentStatus,
            String summary,
            String description,
            BigDecimal latitude,
            BigDecimal longitude,
            String confidenceLevel,
            String privacyLevel,
            String sensitiveLevel,
            Boolean featuredOnHome,
            Integer sortOrder
    ) {
        if (latitude != null && (latitude.compareTo(new BigDecimal("-90")) < 0 || latitude.compareTo(new BigDecimal("90")) > 0)) {
            throw new BusinessException("CULTURE_SITE_LATITUDE_INVALID", "纬度必须在 -90 到 90 之间");
        }
        if (longitude != null && (longitude.compareTo(new BigDecimal("-180")) < 0 || longitude.compareTo(new BigDecimal("180")) > 0)) {
            throw new BusinessException("CULTURE_SITE_LONGITUDE_INVALID", "经度必须在 -180 到 180 之间");
        }
        if ((latitude == null) != (longitude == null)) {
            throw new BusinessException("CULTURE_SITE_COORDINATES_INCOMPLETE", "经纬度必须同时填写或同时留空");
        }
        return new NormalizedSiteInput(
                branchId,
                relatedPersonId,
                normalizeSiteType(siteType),
                requiredText(siteName, 200, "CULTURE_SITE_NAME_REQUIRED", "场所名称不能为空且不能超过 200 字"),
                optionalText(addressText, 500, "CULTURE_SITE_ADDRESS_TOO_LONG", "地址不能超过 500 字"),
                optionalText(foundedPeriod, 200, "CULTURE_SITE_PERIOD_TOO_LONG", "始建年代不能超过 200 字"),
                optionalText(currentStatus, 100, "CULTURE_SITE_CURRENT_STATUS_TOO_LONG", "现实状态不能超过 100 字"),
                optionalText(summary, 1000, "CULTURE_SITE_SUMMARY_TOO_LONG", "摘要不能超过 1000 字"),
                optionalText(description, MAX_DESCRIPTION_LENGTH, "CULTURE_SITE_DESCRIPTION_TOO_LONG", "场所说明不能超过 200000 字"),
                latitude,
                longitude,
                normalizeConfidence(confidenceLevel),
                normalizePrivacy(privacyLevel),
                normalizeSensitive(sensitiveLevel),
                Boolean.TRUE.equals(featuredOnHome),
                sortOrder == null ? 0 : Math.max(0, sortOrder)
        );
    }

    private String normalizeSiteType(String value) {
        try {
            return CultureSiteType.fromValue(normalizeEnum(value)).value();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("CULTURE_SITE_TYPE_INVALID", "文化场所类型不合法");
        }
    }

    private String normalizeConfidence(String value) {
        try {
            return CultureConfidenceLevel.fromValue(normalizeEnum(value)).value();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("CULTURE_SITE_CONFIDENCE_INVALID", "文化场所可信度不合法");
        }
    }

    private String normalizePrivacy(String value) {
        try {
            return CulturePrivacyLevel.fromValue(normalizeEnum(value)).value();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("CULTURE_SITE_PRIVACY_INVALID", "文化场所隐私级别不合法");
        }
    }

    private String normalizeSensitive(String value) {
        try {
            return CultureSensitiveLevel.fromValue(normalizeEnum(value)).value();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("CULTURE_SITE_SENSITIVE_INVALID", "文化场所敏感级别不合法");
        }
    }

    private String normalizeSort(String value) {
        if (value == null || value.isBlank()) return null;
        String[] parts = value.trim().split(",", 2);
        String field = SORT_FIELDS.contains(parts[0]) ? parts[0] : "sortOrder";
        String direction = parts.length > 1 && "desc".equalsIgnoreCase(parts[1]) ? "desc" : "asc";
        return field + "," + direction;
    }

    private String requiredText(String value, int maxLength, String code, String message) {
        String normalized = optionalText(value, maxLength, code, message);
        if (normalized == null) throw new BusinessException(code, message);
        return normalized;
    }

    private String optionalText(String value, int maxLength, String code, String message) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.trim();
        if (normalized.length() > maxLength) throw new BusinessException(code, message);
        return normalized;
    }

    private String normalizeEnum(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String optionalEnum(String value, Function<String, String> normalizer) {
        return value == null || value.isBlank() ? null : normalizer.apply(value);
    }

    public record NormalizedSiteInput(
            Long branchId,
            Long relatedPersonId,
            String siteType,
            String siteName,
            String addressText,
            String foundedPeriod,
            String currentStatus,
            String summary,
            String description,
            BigDecimal latitude,
            BigDecimal longitude,
            String confidenceLevel,
            String privacyLevel,
            String sensitiveLevel,
            boolean featuredOnHome,
            Integer sortOrder
    ) {}
}
